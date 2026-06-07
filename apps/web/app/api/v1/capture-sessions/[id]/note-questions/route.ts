export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deepseekChat } from "@/lib/deepseek/client";

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

For EACH group, produce:
- a short, friendly question asking what they want to explain there.
- exactly 3 likely answer options — concise phrases the user can pick.

GROUP RULES:
- If a group has MULTIPLE elements (e.g. Google, Phone, Email), the question is about the SET ("...about the sign-up options?") and at least one option should explain WHAT EACH ONE DOES (e.g. "Explain each: Google = one-tap, Phone = OTP via SMS, Email = email + password"). Do NOT ask three separate questions for siblings.
- Use ALL metadata, especially meta.controls (child buttons inside the element, e.g. "Add", "Claim") and meta.fullText. If an element exposes distinct sub-actions (Add AND Claim), the options MUST be about those (e.g. "Add = register a new library from Google; Claim = take ownership of one already in our database"). No generic options when the metadata reveals specific features.

Return ONLY valid JSON: an array of objects { "id": string, "question": string, "options": [string, string, string] }. Use the provided group id for each. No prose, no markdown fences.`;

// Deterministic fallback if the AI output can't be parsed.
function fallback(groups: Array<{ id: string; tMs: number; label: string }>): NoteQuestion[] {
  return groups.map((g) => ({
    id: g.id,
    tMs: g.tMs,
    label: g.label,
    question: `What do you want to explain about ${g.label}?`,
    options: ["Explain what each one does", "Why it matters / when to use it", "Just mention it briefly"],
  }));
}

export async function POST(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
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

    const promptGroups = groups.map((g) => ({
      id: g.id,
      elements: g.members.map((m) => ({ label: m.label, meta: m.meta })),
    }));

    let questions: NoteQuestion[];
    try {
      const raw = await deepseekChat({
        maxTokens: 2048,
        messages: [
          { role: "system", content: QUESTION_SYSTEM_PROMPT },
          { role: "user", content: `Note groups:\n${JSON.stringify(promptGroups, null, 2)}` },
        ],
      });
      const json = raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1);
      const parsed = JSON.parse(json) as Array<{ id: string; question: string; options: string[] }>;
      questions = groups
        .map((g) => {
          const p = parsed.find((x) => x.id === g.id);
          const label = groupLabel(g);
          const options = Array.isArray(p?.options)
            ? p.options.filter((o) => typeof o === "string").slice(0, 3)
            : [];
          return {
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
          };
        })
        .filter((q): q is NoteQuestion => q !== null);
      if (questions.length === 0)
        questions = fallback(groups.map((g) => ({ id: g.id, tMs: g.tMs, label: groupLabel(g) })));
    } catch {
      questions = fallback(groups.map((g) => ({ id: g.id, tMs: g.tMs, label: groupLabel(g) })));
    }

    return NextResponse.json({ success: true, data: { questions } }, { headers: CORS_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: CORS_HEADERS });
  }
}
