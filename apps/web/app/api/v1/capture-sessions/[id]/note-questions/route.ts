export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { geminiChat, geminiVisionChat } from "@/lib/gemini/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

type RouteParams = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

interface NoteEvent {
  type?: string;
  t?: number;
  label?: string;
  meta?: Record<string, unknown>;
}

interface NoteQuestion {
  id: string;
  tMs: number;
  label: string;
  question: string;
  options: string[];
}

const QUESTION_SYSTEM_PROMPT = `The user recorded a screen flow and HELD SHIFT over elements to flag "I want to explain THIS here." The notes are pre-GROUPED: each group is one or more sibling elements the user marked together (e.g. the Google / Phone / Email sign-up buttons).

ONLY ASK WHERE YOU'RE GENUINELY UNSURE (most important):
- Do NOT ask a question for every group. Ask ONLY where the marked element's identity AND purpose are NOT obvious from the label + metadata — where you would have to GUESS what the user wants explained.
- Mark a group as "clear": true (no question needed) when the label + meta make it obvious what the element is and why it'd be explained — a self-evident single control (e.g. a "Start Free Trial" button, a "monthly plan" card, a clearly-labelled "UPI QR code" upload). For these the script can be written directly; don't pester the user.
- Mark a group as "clear": false (DO ask) only when it's genuinely ambiguous: a generic/vague label ("this", "Continue", a result row), the captured element likely isn't the one the user meant (cursor-vs-intended mismatch), OR a multi-element set where which distinction to emphasise is unclear (e.g. Google/Phone/Email — ask whether to explain each or just mention).
- If EVERY group is clear, return an empty array — that's a good outcome, not a failure.

For each group you DO ask about, produce:
- ONE short question — max ~12 words, a single plain question, NO explanatory sentences tacked on (e.g. "Explain the sign-up options?", NOT "...Pick your timings and adjust the hours to match your library. Most pick Full Day — you can ch?"). Long questions get truncated in the UI.
- exactly 3 likely answer options — concise phrases the user can pick.

GROUP RULES:
- If a group has MULTIPLE elements (e.g. Google, Phone, Email), the question is about the SET ("...about the sign-up options?") and at least one option should explain WHAT EACH ONE DOES (e.g. "Explain each: Google = one-tap, Phone = OTP via SMS, Email = email + password"). Do NOT ask three separate questions for siblings.
- Use ALL metadata, especially meta.controls (child buttons inside the element, e.g. "Add", "Claim") and meta.fullText. If an element exposes distinct sub-actions (Add AND Claim), the options MUST be about those (e.g. "Add = register a new library from Google; Claim = take ownership of one already in our database"). No generic options when the metadata reveals specific features.

Return ONLY valid JSON: an array of objects { "id": string, "clear": boolean, "question": string, "options": [string, string, string] }. Include an entry for EVERY group with its "clear" verdict; for clear groups "question"/"options" may be empty. Use the provided group id for each. No prose, no markdown fences.`;

// SECOND PASS — vision. The first pass flagged some groups as still-unclear from
// text alone; we now hand the model a SCREENSHOT of each one (the exact frame at
// the moment the user marked it) and ask it to resolve what it can SEE. Most
// "what is this element" doubt disappears once it can look — so it should flip
// most groups to clear:true. Keep clear:false ONLY for a genuine user-preference
// fork a picture can't settle (how much to dwell on a set the user singled out).
const VISION_SYSTEM_PROMPT = `You previously asked for clarification about some elements a user marked ("explain THIS here") in a screen recording, because their TEXT label/metadata was ambiguous. You now have a SCREENSHOT of each marked element, captured at the exact moment it was marked.

Look at each screenshot and RE-DECIDE:
- "clear": true  → the picture makes the element's identity AND purpose obvious, so you can narrate it confidently WITHOUT bothering the user. THIS SHOULD BE MOST OF THEM — the whole point of the screenshot is to stop asking.
- "clear": false → keep asking ONLY if, even WITH the picture, there's a real choice that's the user's to make (e.g. a set they clearly singled out where "explain each vs. mention briefly" is a genuine preference, not something the image decides).

When clear:false, give ONE short question (≤12 words) + exactly 3 concise answer options, same rules as before (a multi-element set → question about the SET, one option explaining what each does).

Each group is given as "Group <id>: <label>" followed by its screenshot, in order. Return ONLY valid JSON: an array of { "id": string, "clear": boolean, "question": string, "options": [string, string, string] } — one entry per group id provided. No prose, no markdown fences.`;

interface ParsedFrame {
  id: string;
  /** Raw base64 (prefix stripped). */
  data: string;
  mimeType: string;
}

export async function POST(req: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    // Optional body. PASS 2 sends `frames: [{ id, dataUrl }]` — a screenshot per
    // still-unclear group (from pass 1). Absent/empty body → PASS 1 (text only).
    let frames: ParsedFrame[] = [];
    try {
      const body = (await req.json()) as { frames?: unknown };
      const rawFrames = Array.isArray(body?.frames) ? body.frames : [];
      frames = rawFrames.flatMap((f): ParsedFrame[] => {
        const fr = f as { id?: unknown; dataUrl?: unknown };
        if (typeof fr?.id !== "string" || typeof fr?.dataUrl !== "string") return [];
        const m = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(fr.dataUrl);
        if (!m) return [];
        return [{ id: fr.id, mimeType: m[1], data: m[2] }];
      });
    } catch {
      /* no body / not JSON → frames stays [] → text pass */
    }

    const session = await prisma.captureSession.findUnique({
      where: { id },
      select: { id: true, events: true, expiresAt: true },
    });
    if (!session) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404, headers: CORS_HEADERS });
    }
    if (session.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: "Session expired" }, { status: 410, headers: CORS_HEADERS });
    }

    const events = (session.events as NoteEvent[]) ?? [];
    const notes = events
      .filter((e) => e.type === "note")
      .map((e) => ({
        tMs: Math.round(e.t ?? 0),
        label: (e.label ?? "this element").toString(),
        meta: (e.meta ?? {}) as Record<string, unknown>,
      }));

    if (notes.length === 0) {
      return NextResponse.json({ success: true, data: { questions: [] } }, { headers: CORS_HEADERS });
    }

    // Group consecutive sibling notes: same element class signature AND within
    // ~6s of the previous one = the user marking a set (e.g. Google/Phone/Email).
    const CLUSTER_GAP_MS = 6000;
    const groups: Array<{ id: string; tMs: number; members: typeof notes }> = [];
    for (const note of notes) {
      const last = groups[groups.length - 1];
      const lastMember = last?.members[last.members.length - 1];
      const sameSig =
        lastMember &&
        String(lastMember.meta.classes ?? "") === String(note.meta.classes ?? "") &&
        note.tMs - lastMember.tMs <= CLUSTER_GAP_MS;
      if (sameSig && last) last.members.push(note);
      else groups.push({ id: `group-${groups.length}`, tMs: note.tMs, members: [note] });
    }

    const groupLabel = (g: (typeof groups)[number]) =>
      Array.from(new Set(g.members.map((m) => m.label))).join(", ");

    // A label that tells us nothing about what was marked → worth asking even for
    // a single mark. A real, descriptive label (the common case — the user said
    // "meta is proper") → trust it, don't ask.
    const GENERIC_LABEL = /^(this element|this|continue|next|submit|save|ok|done|button|link|here|go|back|close|open|menu|item|select|choose|click)$/i;
    const isGenericLabel = (label: string) => {
      const l = label.trim();
      return l.length === 0 || GENERIC_LABEL.test(l);
    };
    // Cap the number of questions even if more qualify — never bury the user.
    const MAX_QUESTIONS = 8;

    const promptGroups = groups.map((g) => ({
      id: g.id,
      elements: g.members.map((m) => ({ label: m.label, meta: m.meta })),
    }));

    // ── PASS 2 (vision) ───────────────────────────────────────────────────────
    // Frames present → the caller already ran pass 1 and is now handing us a
    // screenshot for each still-unclear group. Re-judge those WITH the picture;
    // return only the ones vision STILL can't resolve (a real user-preference
    // fork). Groups without a frame are ignored here — pass 1 already cleared them.
    if (frames.length > 0) {
      const framedGroups = groups.flatMap((g) => {
        const frame = frames.find((f) => f.id === g.id);
        return frame ? [{ g, frame }] : [];
      });
      if (framedGroups.length === 0) {
        return NextResponse.json({ success: true, data: { questions: [] } }, { headers: CORS_HEADERS });
      }

      // One vision turn: images in order, each introduced in the text so the model
      // can map "Image N" → the right group.
      const promptText =
        `Each group below is followed by its screenshot (in image order). Re-judge each:\n\n` +
        framedGroups
          .map(
            ({ g }, i) =>
              `Image ${i + 1} → Group ${g.id}: "${groupLabel(g)}"\nmeta: ${JSON.stringify(
                g.members.map((m) => m.meta),
              )}`,
          )
          .join("\n\n");

      let vparsed: Array<{ id: string; clear?: boolean; question?: string; options?: string[] }> = [];
      try {
        const raw = await geminiVisionChat({
          system: VISION_SYSTEM_PROMPT,
          text: promptText,
          images: framedGroups.map(({ frame }) => ({ data: frame.data, mimeType: frame.mimeType })),
          maxTokens: 2048,
        });
        const json = raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1);
        const maybe = JSON.parse(json);
        if (Array.isArray(maybe)) vparsed = maybe;
      } catch {
        /* vision failed → no verdicts → fall through and keep asking (safe degrade) */
      }

      const visionQuestions: NoteQuestion[] = framedGroups.flatMap(({ g }) => {
        const p = vparsed.find((x) => x.id === g.id);
        // Drop ONLY when vision positively says clear. Vision-unclear OR vision
        // failed (no verdict) → keep asking the user — never silently swallow.
        if (p?.clear === true) return [];
        const label = groupLabel(g);
        const options = Array.isArray(p?.options)
          ? p.options.filter((o) => typeof o === "string").slice(0, 3)
          : [];
        return [
          {
            id: g.id,
            tMs: g.tMs,
            label,
            question:
              typeof p?.question === "string" && p.question
                ? p.question
                : `What do you want to explain about ${label}?`,
            options:
              options.length === 3
                ? options
                : ["Explain what each one does", "Why it matters", "Mention briefly"],
          },
        ];
      });
      return NextResponse.json({ success: true, data: { questions: visionQuestions } }, { headers: CORS_HEADERS });
    }

    // Ask the model for per-group questions + a `clear` verdict. On any failure
    // (network, bad JSON) fall back to an empty list — the deterministic guard
    // below still produces sensible questions from the group shape alone.
    let parsed: Array<{ id: string; clear?: boolean; question?: string; options?: string[] }> = [];
    try {
      // Gemini 2.5 Pro — same model as narration generation. Stronger than the
      // old DeepSeek call, so its `clear:true` verdicts are trustworthy and the
      // guard below can respect them instead of force-asking every cluster.
      const raw = await geminiChat({
        model: "gemini-2.5-pro",
        maxTokens: 2048,
        messages: [
          { role: "system", content: QUESTION_SYSTEM_PROMPT },
          { role: "user", content: `Note groups:\n${JSON.stringify(promptGroups, null, 2)}` },
        ],
      });
      const json = raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1);
      const maybe = JSON.parse(json);
      if (Array.isArray(maybe)) parsed = maybe;
    } catch {
      /* keep parsed = [] → deterministic-only questions */
    }

    // GUARD — trust the model first, heuristic only as a fallback.
    // Gemini 2.5 Pro returns a per-group `clear` verdict. When we HAVE that
    // verdict we respect it directly (clear:true → skip, clear:false → ask) —
    // this is the fix for "knows the element but still asks": a well-labelled
    // cluster like Google/Phone/Email is now skipped when Gemini marks it clear,
    // instead of being force-asked just for being a cluster.
    // The old "ask every cluster / generic label" heuristic survives ONLY as a
    // fallback for groups the model returned NO verdict for (call failed or
    // dropped the group) — so a total model failure still produces sane questions.
    type Scored = NoteQuestion & { isCluster: boolean; members: number };
    const candidates: Scored[] = groups.flatMap((g) => {
      const p = parsed.find((x) => x.id === g.id);
      const label = groupLabel(g);
      const isCluster = g.members.length > 1;
      const hasVerdict = typeof p?.clear === "boolean";
      const worthAsking = hasVerdict
        ? p!.clear === false
        : isCluster || isGenericLabel(label);
      if (!worthAsking) return [];
      const options = Array.isArray(p?.options)
        ? p.options.filter((o) => typeof o === "string").slice(0, 3)
        : [];
      return [
        {
          id: g.id,
          tMs: g.tMs,
          label,
          isCluster,
          members: g.members.length,
          question:
            typeof p?.question === "string" && p.question
              ? p.question
              : `What do you want to explain about ${label}?`,
          options:
            options.length === 3
              ? options
              : ["Explain what each one does", "Why it matters", "Mention briefly"],
        },
      ];
    });

    // Backstop cap — if more than MAX_QUESTIONS still qualify, keep the highest
    // signal ones (clusters first, then larger clusters), then restore time order.
    const picked =
      candidates.length > MAX_QUESTIONS
        ? [...candidates]
            .sort((a, b) => (a.isCluster === b.isCluster ? b.members - a.members : a.isCluster ? -1 : 1))
            .slice(0, MAX_QUESTIONS)
            .sort((a, b) => a.tMs - b.tMs)
        : candidates;
    const questions: NoteQuestion[] = picked.map(({ id, tMs, label, question, options }) => ({
      id,
      tMs,
      label,
      question,
      options,
    }));
    // Zero questions is a VALID outcome (every spot was clear) — the panel falls
    // straight through to generate.

    return NextResponse.json({ success: true, data: { questions } }, { headers: CORS_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: CORS_HEADERS });
  }
}
