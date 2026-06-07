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

const QUESTION_SYSTEM_PROMPT = `The user recorded a screen flow and HELD SHIFT over specific elements to flag "I want to explain THIS here." For each flagged element you are given its label + metadata.

For EACH note, produce:
- a short, friendly question asking what they want to explain at that spot (reference the element by name), and
- exactly 3 likely answer options, grounded in the element (what it is, why it matters, when to use it, or comparing options) — concise phrases the user can pick.

Return ONLY valid JSON: an array of objects { "id": string, "question": string, "options": [string, string, string] }. Use the provided id for each. No prose, no markdown fences.`;

// Deterministic fallback if the AI output can't be parsed.
function fallback(notes: Array<{ id: string; tMs: number; label: string }>): NoteQuestion[] {
  return notes.map((n) => ({
    id: n.id,
    tMs: n.tMs,
    label: n.label,
    question: `What do you want to explain at "${n.label}"?`,
    options: ["What it is and what it does", "Why it matters / when to use it", "Just mention it briefly"],
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
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.type === "note")
      .map(({ e, i }) => ({
        id: `note-${i}`,
        tMs: Math.round(e.t ?? 0),
        label: (e.label ?? "this element").toString(),
        meta: e.meta ?? {},
      }));

    if (notes.length === 0) {
      return NextResponse.json({ success: true, data: { questions: [] } }, { headers: CORS_HEADERS });
    }

    const promptNotes = notes.map((n) => ({ id: n.id, label: n.label, meta: n.meta }));
    let questions: NoteQuestion[];
    try {
      const raw = await deepseekChat({
        maxTokens: 2048,
        messages: [
          { role: "system", content: QUESTION_SYSTEM_PROMPT },
          { role: "user", content: `Notes:\n${JSON.stringify(promptNotes, null, 2)}` },
        ],
      });
      const json = raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1);
      const parsed = JSON.parse(json) as Array<{ id: string; question: string; options: string[] }>;
      questions = parsed
        .map((p) => {
          const note = notes.find((n) => n.id === p.id);
          if (!note) return null;
          const options = Array.isArray(p.options) ? p.options.filter((o) => typeof o === "string").slice(0, 3) : [];
          return {
            id: note.id,
            tMs: note.tMs,
            label: note.label,
            question: typeof p.question === "string" && p.question ? p.question : `What do you want to explain at "${note.label}"?`,
            options: options.length === 3 ? options : ["What it is", "Why it matters", "Mention briefly"],
          };
        })
        .filter((q): q is NoteQuestion => q !== null);
      if (questions.length === 0) questions = fallback(notes);
    } catch {
      questions = fallback(notes);
    }

    return NextResponse.json({ success: true, data: { questions } }, { headers: CORS_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: CORS_HEADERS });
  }
}
