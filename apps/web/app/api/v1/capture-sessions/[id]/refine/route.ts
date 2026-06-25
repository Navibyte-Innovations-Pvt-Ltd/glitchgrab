export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { geminiChat } from "@/lib/gemini/client";
import { type ZoomCtx } from "@/lib/narration/prompt";
import {
  buildRefineSystem,
  buildRefineContextTurn,
  resolveRefinement,
} from "@/lib/narration/refine";
import { buildScriptContext } from "@/lib/narration/events-context";
import { recordRefinement } from "@/lib/narration/telemetry";

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

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

// Conversationally refine an existing narration script. The model edits ONLY the
// paragraphs the user's request is about (addressed as [#n]); untouched
// paragraphs are reused verbatim in code, so hand-tuned clip-sync survives. See
// lib/narration/refine.ts + merge-edit.ts.
export async function POST(req: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      messages?: ChatMsg[];
      currentScript?: string;
      lang?: string;
      gender?: string;
      durationSec?: number;
      zooms?: ZoomCtx[];
    };

    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (!messages.length) {
      return NextResponse.json(
        { success: false, error: "No chat messages provided" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

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

    const system = buildRefineSystem({
      lang: body.lang,
      gender: body.gender,
      durationSec: body.durationSec,
      zooms: body.zooms,
    });

    // Leading context turn: the events + the NUMBERED current script the user is
    // refining (paragraphs addressed [#n] so the model can target them).
    const contextTurn = buildRefineContextTurn({
      eventsJson,
      appLine,
      metaSection,
      currentScript: body.currentScript,
    });

    // Seed the prior script (un-numbered) so the model has the clean text too.
    const seed: ChatMsg[] = body.currentScript?.trim()
      ? [{ role: "assistant", content: body.currentScript }]
      : [];
    const raw = await geminiChat({
      // gemini-2.5-pro — same generator as the initial script (see
      // capture-sessions/[id]/route.ts), so refinements obey the same TTS / format
      // / Devanagari rules and ~20s latency is covered by maxDuration above.
      model: "gemini-2.5-pro",
      messages: [
        { role: "system", content: system },
        { role: "user", content: contextTurn },
        ...seed,
        ...messages,
      ],
    });

    // Parse the reply + apply only the changed paragraphs onto the current
    // script; untouched paragraphs stay byte-identical. Falls back to a full
    // replace when the model returns no [#n] blocks. See resolveRefinement.
    const { reply, script } = resolveRefinement(raw, body.currentScript ?? "");

    // Telemetry: log the user's refinement request + the version it produced, so
    // we can see how many turns scripts need. Only when a new script came back.
    if (script) {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
      await recordRefinement({
        sessionId: id,
        userMessage: lastUserMsg?.content ?? "",
        resultingScript: script,
      });
    }

    return NextResponse.json(
      { success: true, data: { reply: reply || (script ? "Script updated." : ""), script } },
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
