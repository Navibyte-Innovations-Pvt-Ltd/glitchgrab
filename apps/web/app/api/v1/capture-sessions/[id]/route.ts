export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { geminiChat, geminiVisionChat } from "@/lib/gemini/client";
import { deepseekChat } from "@/lib/deepseek/client";
import {
  SCRIPT_SYSTEM_PROMPT,
  recordingContext,
  languageDirective,
  visualContextDirective,
  isRomanHindiFallback,
  DEVANAGARI_FIX_INSTRUCTION,
  type ZoomCtx,
} from "@/lib/narration/prompt";

// Screenshots of silent stretches (lead-in / idle) sent by the editor so the
// model can narrate what's on screen where no clicks were captured.
const VISUAL_DATA_URL_RE = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/;
type VisualFrame = { tMs: number; kind: "lead-in" | "idle"; mimeType: string; data: string };
function parseVisualFrames(raw: unknown): VisualFrame[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((f): VisualFrame[] => {
      const fr = f as { tMs?: unknown; dataUrl?: unknown; kind?: unknown };
      if (typeof fr?.dataUrl !== "string" || typeof fr?.tMs !== "number") return [];
      const m = VISUAL_DATA_URL_RE.exec(fr.dataUrl);
      if (!m) return [];
      return [{ tMs: fr.tMs, kind: fr.kind === "lead-in" ? "lead-in" : "idle", mimeType: m[1], data: m[2] }];
    })
    .sort((a, b) => a.tMs - b.tMs)
    .slice(0, 8);
}
import { buildScriptContext, buildOrderedStepsFromEvents, checkScriptOrder } from "@/lib/narration/events-context";
import { recordGeneration } from "@/lib/narration/telemetry";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

type RouteParams = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const session = await prisma.captureSession.findUnique({
      where: { id },
      select: { id: true, events: true, script: true, createdAt: true, expiresAt: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    if (session.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "Session expired" },
        { status: 410, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, data: session },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const { lang, gender, durationSec, zooms, noteAnswers, visualContext } = (await req.json().catch(() => ({}))) as {
      lang?: string;
      gender?: string;
      durationSec?: number;
      zooms?: ZoomCtx[];
      noteAnswers?: Array<{ label: string; answer: string }>;
      visualContext?: unknown;
    };
    const visualFrames = parseVisualFrames(visualContext);
    const visualSection = visualFrames.length
      ? visualContextDirective(visualFrames.map((f) => ({ tMs: f.tMs, kind: f.kind })))
      : "";
    const noteSection =
      noteAnswers && noteAnswers.length
        ? `\n\nWhat the user wants explained at each shift-marked spot (USE these — explain exactly this at that element):\n${noteAnswers
            .filter((n) => n.answer?.trim())
            .map((n) => `- "${n.label}": ${n.answer}`)
            .join("\n")}`
        : "";
    const session = await prisma.captureSession.findUnique({
      where: { id },
      select: { id: true, events: true, meta: true, expiresAt: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    if (session.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "Session expired" },
        { status: 410, headers: CORS_HEADERS }
      );
    }

    const { eventsJson, appLine } = buildScriptContext(session.events);
    const metaSection = session.meta
      ? `\n\nRecording metadata (cuts made in Recordly):\n${JSON.stringify(session.meta, null, 2)}`
      : "";

    const userContent = `Generate a narration script for this screen recording.\n\nEvents:\n${eventsJson}${appLine}${metaSection}${noteSection}${visualSection}${recordingContext(durationSec, zooms)}${languageDirective(lang, gender)}`;
    const messages = [
      { role: "system" as const, content: SCRIPT_SYSTEM_PROMPT },
      { role: "user" as const, content: userContent },
    ];
    // gemini-2.5-pro is the primary generator: on a 145-event capture it obeyed
    // the Sarvam TTS rules (no "₹", no hyphens) and the word budget where
    // deepseek-v4-pro broke them, and it's faster (~20s vs ~40–60s). If Gemini
    // fails/empties (quota, safety block, network), fall back to deepseek-v4-flash
    // so a script still ships rather than failing the whole generate to 0 chars.
    const genStart = Date.now();
    let model = "gemini-2.5-pro";
    let script: string;
    if (visualFrames.length) {
      // Silent stretches present → use the vision model so it can SEE those
      // screens (Gemini 2.5 Pro is multimodal). DeepSeek is text-only, so the
      // fallback loses the visual narration but still ships a script.
      model = "gemini-2.5-pro-vision";
      try {
        script = await geminiVisionChat({
          model: "gemini-2.5-pro",
          system: SCRIPT_SYSTEM_PROMPT,
          images: visualFrames.map((f) => ({ data: f.data, mimeType: f.mimeType })),
          text: userContent,
        });
      } catch {
        model = "deepseek-v4-flash";
        script = await deepseekChat({ model: "deepseek-v4-flash", messages });
      }
    } else {
      try {
        script = await geminiChat({ model: "gemini-2.5-pro", messages });
      } catch {
        model = "deepseek-v4-flash";
        script = await deepseekChat({ model: "deepseek-v4-flash", messages });
      }
    }
    let devanagariRetried = false;

    // Devanagari guard: lang=hi sometimes comes back in Roman/Latin Hindi despite
    // the rule. Detect it and re-ask ONCE to rewrite the same script in Devanagari.
    // CRITICAL: this is best-effort — it must NEVER lose the original script. The
    // retry can throw (DeepSeek empties on noisy note-sessions) or return empty;
    // either way keep the first script (Roman-but-present beats an empty 500). An
    // earlier version let the retry throw uncaught → the whole generate 500'd →
    // the editor got a 0-char script on every site that hit a note.
    if (isRomanHindiFallback(script, lang)) {
      devanagariRetried = true;
      try {
        const fixMessages = [
          ...messages,
          { role: "assistant" as const, content: script },
          { role: "user" as const, content: DEVANAGARI_FIX_INSTRUCTION },
        ];
        const fixed = model.startsWith("gemini")
          ? await geminiChat({ model: "gemini-2.5-pro", messages: fixMessages })
          : await deepseekChat({ model: "deepseek-v4-flash", messages: fixMessages });
        if (fixed && fixed.trim().length > 20 && !isRomanHindiFallback(fixed, lang)) {
          script = fixed;
        }
      } catch {
        /* keep the original script — a present Roman script beats an empty one */
      }
    }

    // Best-effort ordering check — warns in logs when the model reordered steps
    // relative to event timestamps. Never blocks the response.
    try {
      const steps = buildOrderedStepsFromEvents(
        Array.isArray(session.events)
          ? (session.events as unknown as Parameters<typeof buildOrderedStepsFromEvents>[0])
          : [],
      );
      if (steps.length >= 2) {
        const { ok, violations } = checkScriptOrder(script, steps);
        if (!ok) {
          console.warn("[narration] script ordering violation", { sessionId: id, violations });
        }
      }
    } catch {
      // ignore — ordering check must never affect the response
    }

    await prisma.captureSession.update({
      where: { id },
      data: { script },
    });

    // Persist training/feedback telemetry (best-effort, never blocks the response).
    await recordGeneration({
      sessionId: id,
      events: session.events,
      meta: session.meta,
      lang,
      gender,
      durationSec,
      noteAnswers,
      model,
      genLatencyMs: Date.now() - genStart,
      initialScript: script,
      devanagariRetried,
    });

    return NextResponse.json(
      { success: true, data: { script } },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
