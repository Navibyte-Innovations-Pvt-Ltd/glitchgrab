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
import { buildScriptContext } from "@/lib/narration/events-context";

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

    const script = await deepseekChat({
      model: "deepseek-reasoner",
      messages: [
        { role: "system", content: SCRIPT_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Generate a narration script for this screen recording.\n\nEvents:\n${eventsJson}${appLine}${metaSection}${noteSection}${recordingContext(durationSec, zooms)}${languageDirective(lang, gender)}`,
        },
      ],
    });

    await prisma.captureSession.update({
      where: { id },
      data: { script },
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
