export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { geminiChat, geminiVisionChat } from "@/lib/gemini/client";
import {
  parseFrames,
  resolveVisionQuestions,
  QUESTION_SYSTEM_PROMPT,
  VISION_SYSTEM_PROMPT,
  type ParsedFrame,
} from "./logic";

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

export async function POST(req: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    // Optional body. PASS 2 sends `frames: [{ id, dataUrl }]` — a screenshot per
    // still-unclear group (from pass 1). Absent/empty body → PASS 1 (text only).
    let frames: ParsedFrame[] = [];
    try {
      const body = (await req.json()) as { frames?: unknown };
      frames = parseFrames(body?.frames);
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
          // Headroom so a multi-frame verdict array never truncates (a dropped
          // verdict → that spot gets asked anyway, per resolveVisionQuestions).
          images: framedGroups.map(({ frame }) => ({ data: frame.data, mimeType: frame.mimeType })),
          maxTokens: 8192,
        });
        const json = raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1);
        const maybe = JSON.parse(json);
        if (Array.isArray(maybe)) vparsed = maybe;
      } catch {
        /* vision failed → no verdicts → fall through and keep asking (safe degrade) */
      }

      // Drop only the groups vision positively cleared; keep the rest (incl. any
      // the model failed to return a verdict for) — see resolveVisionQuestions.
      const visionQuestions = resolveVisionQuestions(
        framedGroups.map(({ g }) => ({ id: g.id, tMs: g.tMs, label: groupLabel(g) })),
        vparsed,
      );
      return NextResponse.json({ success: true, data: { questions: visionQuestions } }, { headers: CORS_HEADERS });
    }

    // Ask the model for per-group questions + a `clear` verdict. On any failure
    // (network, bad JSON) fall back to an empty list — the deterministic guard
    // below still produces sensible questions from the group shape alone.
    let parsed: Array<{ id: string; clear?: boolean; question?: string; options?: string[] }> = [];
    try {
      // Gemini 2.5 FLASH — this is a classify-each-group + short-question task,
      // not deep reasoning. Flash matches Pro's verdicts here (measured) at ~8s
      // vs ~18s, and the bigger token budget avoids the thinking-model truncating
      // its verdict array on a large recording (which would drop verdicts → the
      // guard below would force-ask those clusters). Pro's quality buys nothing.
      const raw = await geminiChat({
        model: "gemini-2.5-flash",
        maxTokens: 8192,
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
        ? p?.clear === false
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
