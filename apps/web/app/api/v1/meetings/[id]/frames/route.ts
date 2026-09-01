export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findScopedMeeting, resolveMeetingCaller } from "@/lib/meetings";
import { presignFrameUpload, presignRecordingPlayback } from "@/lib/recordings";

type RouteParams = { params: Promise<{ id: string }> };

/** A three-hour call at one frame every 12s is 900 — refuse to store a runaway. */
const MAX_FRAMES_PER_MEETING = 400;

/**
 * POST /api/v1/meetings/:id/frames
 *
 * The bot asks for somewhere to put the still frames it grabbed during the
 * call, gets a presigned PUT per frame, and uploads them itself. Same reasoning
 * as the audio: the bytes never pass through this function.
 *
 * Rows are written BEFORE the upload, not after. A row whose object failed to
 * upload is a broken thumbnail; a successful upload with no row is a frame
 * nobody can ever find, which is the worse half of the trade.
 *
 * Body: { frames: [{ tMs: number, bytes?: number }] }
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const caller = await resolveMeetingCaller(request);
    if (!caller) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const meeting = await findScopedMeeting(caller, id);
    if (!meeting) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      frames?: { tMs?: number; bytes?: number }[];
    };

    const frames = (body.frames ?? [])
      .filter((f) => typeof f.tMs === "number" && f.tMs >= 0)
      .slice(0, MAX_FRAMES_PER_MEETING);

    if (frames.length === 0) {
      return NextResponse.json(
        { success: false, error: "frames must be a non-empty array of { tMs }" },
        { status: 400 }
      );
    }

    const targets = await Promise.all(
      frames.map(async (f) => {
        const tMs = Math.round(f.tMs as number);
        const { key, url } = await presignFrameUpload(meeting.id, tMs);
        const row = await prisma.meetingFrame.upsert({
          where: { id: `${meeting.id}-${tMs}` },
          // A retried upload of the same moment overwrites the same S3 key, so
          // the row must be reused too or the panel shows the frame twice.
          create: {
            id: `${meeting.id}-${tMs}`,
            meetingId: meeting.id,
            tMs,
            key,
            bytes: typeof f.bytes === "number" ? f.bytes : null,
          },
          update: { key, bytes: typeof f.bytes === "number" ? f.bytes : null },
        });
        return { id: row.id, tMs, key, url };
      })
    );

    return NextResponse.json({ success: true, data: { frames: targets } });
  } catch (error) {
    console.error("Meeting frames error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** GET /api/v1/meetings/:id/frames — thumbnails for the call page. */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const caller = await resolveMeetingCaller(request);
    if (!caller) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const meeting = await findScopedMeeting(caller, id);
    if (!meeting) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const frames = await prisma.meetingFrame.findMany({
      where: { meetingId: meeting.id },
      orderBy: { tMs: "asc" },
    });

    // Minted per request and short-lived, exactly like the audio playback urls.
    const withUrls = await Promise.all(
      frames.map(async (f) => ({
        id: f.id,
        tMs: f.tMs,
        url: await presignRecordingPlayback(f.key).catch(() => null),
      }))
    );

    return NextResponse.json({ success: true, data: { frames: withUrls } });
  } catch (error) {
    console.error("Meeting frames fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
