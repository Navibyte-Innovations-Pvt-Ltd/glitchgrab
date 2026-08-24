export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findScopedMeeting, resolveMeetingCaller } from "@/lib/meetings";
import { stopBotRecording } from "@/lib/meet-bot";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/meetings/:id/stop — get the bot out of the call.
 *
 * Leave-detection reads a DOM Google rewrites without notice, and every check
 * in it fails towards "keep recording". When it is wrong, the bot sits in the
 * client's call until the three-hour cap — visible to everyone on it. This is
 * the way out that keeps the audio: the bot leaves properly and uploads what
 * it has, unlike restarting the service.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const caller = await resolveMeetingCaller(request);
    if (!caller || caller.isBot) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const meeting = await findScopedMeeting(caller, id);
    if (!meeting) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const result = await stopBotRecording(meeting.id);

    // Only a 404 means the bot service looked and found nothing: the row is
    // claiming a bot that no longer exists, so correct it. A timeout or a 5xx
    // means the request never landed — the bot is still in the call and will
    // keep reporting, and overwriting the row would bury a live recording
    // under a FAILED badge.
    if (!result.ok && result.status === 404) {
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          botStatus: "FAILED",
          botError: result.error?.slice(0, 500) ?? "The bot could not be stopped",
          status: "FAILED",
          endsAt: new Date(),
        },
      });
      return NextResponse.json(
        { success: false, error: "That recording is no longer running" },
        { status: 404 }
      );
    }

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error ?? "Could not reach the bot service" },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, data: { stopping: true } });
  } catch (error) {
    console.error("Bot stop error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
