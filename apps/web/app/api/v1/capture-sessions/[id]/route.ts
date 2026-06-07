export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deepseekChat } from "@/lib/deepseek/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const SCRIPT_SYSTEM_PROMPT = `You generate narration scripts for screen recording videos.

You receive browser click events AND optional recording metadata showing which parts were cut in editing.

Event fields: type (click|navigate|idle), t (ms from capture start), label, tag, url, durationMs.

Recording metadata fields (if present):
- keptRanges: [{startMs, endMs}] — time ranges that exist in the FINAL edited video
- cutRanges: [{startMs, endMs}] — time ranges the editor CUT OUT
- originalDurationMs, finalDurationMs

CRITICAL RULES for cuts:
- If an event's t falls inside a cutRange → SKIP it entirely, do not narrate it
- If an idle event spans a cutRange → the waiting was edited out, do NOT say "after a moment"
- Only narrate events within keptRanges
- If no metadata provided, narrate all events using standard rules below

Standard rules:
- idle < 5s in kept range: omit or "quickly" / "then"
- idle 5–15s in kept range: "After a moment..."
- idle > 15s in kept range: "Let's take a look at..."
- icon-button or unknown: infer from context (page URL, surrounding events)
- Rapid same-element clicks: group into one sentence
- navigate events: start new section
- Output ONLY narration text — no timestamps, no JSON, no markdown
- Present tense, one sentence per meaningful action`;


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

export async function POST(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
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

    const eventsJson = JSON.stringify(session.events, null, 2);
    const metaSection = session.meta
      ? `\n\nRecording metadata (cuts made in Recordly):\n${JSON.stringify(session.meta, null, 2)}`
      : "";

    const script = await deepseekChat({
      maxTokens: 2048,
      messages: [
        { role: "system", content: SCRIPT_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Generate a narration script for this screen recording.\n\nEvents:\n${eventsJson}${metaSection}`,
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
