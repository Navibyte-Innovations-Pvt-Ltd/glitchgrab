export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findScopedMeeting, resolveMeetingCaller } from "@/lib/meetings";
import { presignRecordingPlayback } from "@/lib/recordings";
import { collectMeetingTranscript } from "@/lib/sarvam/collect";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/meetings/:id — one recorded call: transcript, playback, status.
 *
 * Opening a still-transcribing meeting nudges the Sarvam job forward. That
 * makes the dashboard self-healing without a cron: the person waiting for the
 * transcript is the one refreshing the page.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const caller = await resolveMeetingCaller(request);
    if (!caller) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    let meeting = await findScopedMeeting(caller, id);
    if (!meeting) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    if (meeting.transcriptStatus === "RUNNING") {
      await collectMeetingTranscript(meeting.id).catch(() => {});
      meeting = await findScopedMeeting(caller, id);
      if (!meeting) {
        return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
      }
    }

    // Playback urls are minted per request and expire quickly — the bucket is
    // private and these are client conversations.
    const [tabUrl, micUrl] = await Promise.all([
      meeting.tabRecordingKey
        ? presignRecordingPlayback(meeting.tabRecordingKey).catch(() => null)
        : null,
      meeting.micRecordingKey
        ? presignRecordingPlayback(meeting.micRecordingKey).catch(() => null)
        : null,
    ]);

    const repoFullName = caller.repos.find((r) => r.id === meeting.repoId)?.fullName ?? "";

    return NextResponse.json({
      success: true,
      data: {
        id: meeting.id,
        repoId: meeting.repoId,
        repoFullName,
        title: meeting.title,
        meetUrl: meeting.meetUrl,
        startsAt: meeting.startsAt?.toISOString() ?? null,
        endsAt: meeting.endsAt?.toISOString() ?? null,
        durationSec: meeting.durationSec,
        status: meeting.status,
        // Without these a failed bot shows a red badge and nothing else — the
        // reason it failed is the whole point of recording it.
        recorder: meeting.recorder,
        botStatus: meeting.botStatus,
        botError: meeting.botError,
        transcript: meeting.transcript,
        transcriptStatus: meeting.transcriptStatus,
        transcriptError: meeting.transcriptError,
        tabAudioUrl: tabUrl,
        micAudioUrl: micUrl,
        createdAt: meeting.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Meeting fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** DELETE /api/v1/meetings/:id — remove the row. */
export async function DELETE(request: Request, { params }: RouteParams) {
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

    await prisma.meeting.delete({ where: { id: meeting.id } });

    // NOTE: the S3 objects are intentionally left in place — retention for
    // recordings is "forever" (#311). A real purge is a separate, deliberate
    // action, not a side effect of tidying a list.
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Meeting delete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
