export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deepseekChat } from "@/lib/deepseek/client";
import {
  SCRIPT_SYSTEM_PROMPT,
  recordingContext,
  languageDirective,
  type ZoomCtx,
} from "@/lib/narration/prompt";
import { parseRefineReply } from "@/lib/narration/parse-refine";
import { buildScriptContext } from "@/lib/narration/events-context";

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

// Conversationally refine an existing narration script. The model always replies
// with the COMPLETE revised script (no commentary) so the editor can sync it
// straight into the narration box.
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

    const system =
      SCRIPT_SYSTEM_PROMPT +
      `\n\nYou are now REFINING an existing script through a CHAT with the user. Behave like a thoughtful collaborator:
- If the user's request is clear, briefly say what you changed (one short line), THEN output the COMPLETE revised script after a line containing exactly:
---SCRIPT---
- If you genuinely need to clarify intent (e.g. you can't tell what an element is, or the instruction is ambiguous), ASK a short question and do NOT include the ---SCRIPT--- marker or any script.
- Reference specific moments by what's on screen when helpful. Keep chat replies short; put the effort into the script itself.
- The script that follows ---SCRIPT--- must obey ALL the rules above (length budget, notes clustering, speakable text, language format).` +
      recordingContext(body.durationSec, body.zooms) +
      languageDirective(body.lang, body.gender);

    // Leading context turn: the events + the current script the user is refining.
    const contextTurn =
      `Events:\n${eventsJson}${appLine}${metaSection}\n\nCURRENT SCRIPT (refine this per my next messages):\n${body.currentScript ?? "(empty — write a fresh script)"}`;

    const seed: ChatMsg[] = body.currentScript?.trim()
      ? [{ role: "assistant", content: body.currentScript }]
      : [];
    const raw = await deepseekChat({
      model: "deepseek-v4-pro",
      messages: [
        { role: "system", content: system },
        { role: "user", content: contextTurn },
        ...seed,
        ...messages,
      ],
    });

    // Split on the marker: text before = conversational reply, after = the full
    // revised script. Tolerant to delimiter drift — see parseRefineReply.
    const { reply, script } = parseRefineReply(raw);

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
