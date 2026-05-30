export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClaude } from "@/lib/claude/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const SCRIPT_SYSTEM_PROMPT = `You generate narration scripts for screen recording videos.

You receive a JSON array of browser events captured during the recording.
Each event has: type (click|navigate|idle), t (ms from start), label, tag, url, durationMs.

Rules:
- Convert event sequence to fluent narration a human would speak while watching
- idle < 5s: omit or use "quickly" / "then"
- idle 5–15s: "After a moment, ..."
- idle > 15s: "After reviewing the page, ..."
- icon-button or unknown label: infer from context (surrounding navigation, page URL)
- Rapid repeated clicks on same element: "clicks X repeatedly" not separate sentences
- Navigate events start new topic/section
- Output ONLY the narration text — no timestamps, no JSON, no markdown
- Write in present tense ("The user clicks...", "We navigate to...")
- Keep it concise — one sentence per meaningful action
- Group closely-timed related actions into one sentence`;

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
      select: { id: true, events: true, expiresAt: true },
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

    const claude = getClaude();
    const response = await claude.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      system: SCRIPT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate a narration script for this screen recording.\n\nEvents:\n${eventsJson}`,
        },
      ],
    });

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") {
      throw new Error("AI returned no text");
    }
    const script = block.text.trim();

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
