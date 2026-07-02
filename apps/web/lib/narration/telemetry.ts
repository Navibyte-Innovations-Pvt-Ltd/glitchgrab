// Narration telemetry: persist the full generation → refinement lifecycle so we
// can analyze how much refinement scripts need and improve the model later.
//
// CRITICAL: every write here is best-effort and wrapped so a telemetry failure
// can NEVER break script generation or refinement. Callers fire-and-forget.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { deriveAppName } from "./events-context";
import { devanagariRatio, isRomanHindiFallback } from "./prompt";

interface Eventish {
  type?: string;
  [k: string]: unknown;
}

interface GenerationRecord {
  sessionId: string;
  events: unknown;
  meta: unknown;
  lang?: string;
  gender?: string;
  durationSec?: number;
  noteAnswers?: Array<{ label: string; answer: string }>;
  model: string;
  genLatencyMs: number;
  initialScript: string;
  devanagariRetried: boolean;
}

// Count shift-mark "note" events — the signal for whether the user gave the AI
// explicit guidance ("explain THIS here") vs a bare browse with no notes.
function noteStats(events: unknown): { hasNotes: boolean; noteCount: number; eventCount: number } {
  const list = Array.isArray(events) ? (events as Eventish[]) : [];
  const noteCount = list.filter((e) => e?.type === "note").length;
  return { hasNotes: noteCount > 0, noteCount, eventCount: list.length };
}

// Record the initial generation. Upsert by sessionId so a re-generate overwrites
// the prior attempt for the same session rather than duplicating.
export async function recordGeneration(r: GenerationRecord): Promise<void> {
  try {
    const list = Array.isArray(r.events) ? (r.events as Eventish[]) : [];
    const { hasNotes, noteCount, eventCount } = noteStats(r.events);
    const script = r.initialScript ?? "";
    const wasEmpty = script.trim().length === 0;
    const wasRoman = isRomanHindiFallback(script, r.lang);
    const ratio = devanagariRatio(script);
    const appName = deriveAppName(list) || null;

    const base = {
      events: r.events as Prisma.InputJsonValue,
      meta: (r.meta ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      appName,
      lang: r.lang ?? null,
      gender: r.gender ?? null,
      durationSec: typeof r.durationSec === "number" ? Math.round(r.durationSec) : null,
      eventCount,
      hasNotes,
      noteCount,
      noteAnswers: (r.noteAnswers ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      model: r.model,
      genLatencyMs: Math.round(r.genLatencyMs),
      initialScript: script,
      initialChars: script.length,
      wasEmpty,
      wasRoman,
      devanagariRetried: r.devanagariRetried,
      devanagariRatio: ratio,
      // Seed the "final" with the initial; refinements update it as they arrive.
      finalScript: script,
      finalChars: script.length,
    };

    await prisma.narrationTelemetry.upsert({
      where: { sessionId: r.sessionId },
      // Re-generate: reset the generation fields AND the refinement history (a
      // fresh script means the old refinements no longer apply).
      update: { ...base, refinements: [] as unknown as Prisma.InputJsonValue, refineCount: 0 },
      create: { sessionId: r.sessionId, ...base },
    });
  } catch {
    /* telemetry is best-effort — never break generation */
  }
}

// Append one refinement turn (the user's request + the version it produced).
export async function recordRefinement(params: {
  sessionId: string;
  userMessage: string;
  resultingScript: string;
}): Promise<void> {
  try {
    const existing = await prisma.narrationTelemetry.findUnique({
      where: { sessionId: params.sessionId },
      select: { refinements: true },
    });
    if (!existing) return; // no generation row → nothing to attach to
    const prior = Array.isArray(existing.refinements) ? (existing.refinements as unknown[]) : [];
    const turn = {
      ts: new Date().toISOString(),
      userMessage: params.userMessage,
      resultingScript: params.resultingScript,
      chars: params.resultingScript.length,
    };
    const refinements = [...prior, turn];
    await prisma.narrationTelemetry.update({
      where: { sessionId: params.sessionId },
      data: {
        refinements: refinements as unknown as Prisma.InputJsonValue,
        refineCount: refinements.length,
        finalScript: params.resultingScript,
        finalChars: params.resultingScript.length,
      },
    });
  } catch {
    /* best-effort */
  }
}
