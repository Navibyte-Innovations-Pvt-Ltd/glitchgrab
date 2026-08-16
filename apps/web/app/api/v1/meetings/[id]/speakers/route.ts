export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findScopedMeeting, resolveMeetingCaller } from "@/lib/meetings";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-gg-session",
  "Access-Control-Max-Age": "86400",
};

type RouteParams = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** Guards against a runaway caption buffer becoming a runaway JSON column. */
const MAX_CAPTIONS = 5000;
const MAX_PARTICIPANTS = 50;
const MAX_TEXT = 500;

/**
 * POST /api/v1/meetings/:id/speakers
 *
 * Names read off the Google Meet page while the call was recorded: who was in
 * it, and Meet's own captions (speaker + line + time).
 *
 * We record the TAB's audio, which is every remote participant already mixed
 * together — Sarvam can tell the voices apart but has no way to name them. This
 * is what turns "Client (0)" into a person. The captions are used for names
 * only; the words always come from Sarvam.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const caller = await resolveMeetingCaller(request);
    if (!caller) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const { id } = await params;
    const meeting = await findScopedMeeting(caller, id);
    if (!meeting) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      captions?: { speaker?: unknown; text?: unknown; t?: unknown }[];
      participants?: unknown[];
    };

    const captions = (body.captions ?? [])
      .filter(
        (c) =>
          typeof c.speaker === "string" &&
          typeof c.text === "string" &&
          typeof c.t === "number" &&
          c.speaker.trim() &&
          c.text.trim()
      )
      .slice(0, MAX_CAPTIONS)
      .map((c) => ({
        speaker: (c.speaker as string).trim().slice(0, 60),
        text: (c.text as string).trim().slice(0, MAX_TEXT),
        t: Math.max(0, Math.round(c.t as number)),
      }));

    const participants = (body.participants ?? [])
      .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
      .map((p) => p.trim().slice(0, 60))
      .slice(0, MAX_PARTICIPANTS);

    // Union with what's already stored rather than replacing it. The extension
    // re-reads the participant list every 15s, so the final push only sees who
    // was still in the call at the end — someone who spoke and then left would
    // vanish, and with them the name for their lines.
    const existing = Array.isArray(meeting.participants)
      ? (meeting.participants as unknown as string[]).filter((p) => typeof p === "string")
      : [];

    const mergedParticipants = [...new Set([...existing, ...participants])].slice(
      0,
      MAX_PARTICIPANTS
    );

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        ...(captions.length > 0 ? { captions } : {}),
        ...(mergedParticipants.length > 0 ? { participants: mergedParticipants } : {}),
      },
    });

    return NextResponse.json(
      { success: true, data: { captions: captions.length, participants: participants.length } },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Meeting speakers error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
