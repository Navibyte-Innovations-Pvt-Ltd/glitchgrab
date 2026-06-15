export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deepseekChat } from "@/lib/deepseek/client";
import {
  SCRIPT_SYSTEM_PROMPT,
  recordingContext,
  languageDirective,
  isRomanHindiFallback,
  DEVANAGARI_FIX_INSTRUCTION,
  type ZoomCtx,
} from "@/lib/narration/prompt";
import { buildScriptContext } from "@/lib/narration/events-context";
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
    const { lang, gender, durationSec, zooms, noteAnswers } = (await req.json().catch(() => ({}))) as {
      lang?: string;
      gender?: string;
      durationSec?: number;
      zooms?: ZoomCtx[];
      noteAnswers?: Array<{ label: string; answer: string }>;
    };
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

    const userContent = `Generate a narration script for this screen recording.\n\nEvents:\n${eventsJson}${appLine}${metaSection}${noteSection}${recordingContext(durationSec, zooms)}${languageDirective(lang, gender)}`;
    const messages = [
      { role: "system" as const, content: SCRIPT_SYSTEM_PROMPT },
      { role: "user" as const, content: userContent },
    ];
    // Use v4-flash (non-thinking), NOT v4-pro (thinking). v4-pro spends 30–60s+
    // "reasoning" before the answer on real noisy captures (measured: 52s for a
    // 13k-token, 160-event browse) — that blows past the editor's generate poll
    // window, so the panel sees a 0-char script and the demo video ships with no
    // narration. v4-flash answers the SAME payload in ~8s, follows the literal
    // script/cluster/Devanagari format rules BETTER (thinking models drift off the
    // instructions), and on the repro returned correct Devanagari where v4-pro
    // returned Roman Hindi (which would itself trigger the slow retry below).
    const genStart = Date.now();
    let script = await deepseekChat({ model: "deepseek-v4-flash", messages });
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
        const fixed = await deepseekChat({
          model: "deepseek-v4-flash",
          messages: [
            ...messages,
            { role: "assistant" as const, content: script },
            { role: "user" as const, content: DEVANAGARI_FIX_INSTRUCTION },
          ],
        });
        if (fixed && fixed.trim().length > 20 && !isRomanHindiFallback(fixed, lang)) {
          script = fixed;
        }
      } catch {
        /* keep the original script — a present Roman script beats an empty one */
      }
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
      model: "deepseek-v4-flash",
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
