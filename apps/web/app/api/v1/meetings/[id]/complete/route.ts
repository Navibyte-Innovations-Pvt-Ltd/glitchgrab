export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findScopedMeeting, resolveMeetingCaller } from "@/lib/meetings";
import { recordingKey } from "@/lib/recordings";
import { startBatchJob } from "@/lib/sarvam/batch";

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

/**
 * POST /api/v1/meetings/:id/complete
 *
 * The extension calls this once both uploads have actually finished. Only then
 * is the Sarvam job started — starting it earlier would transcribe whatever
 * partial bytes had landed.
 *
 * Body: { tracks: ["tab","mic"], durationSec?, sarvamUploaded?: boolean }
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
      tracks?: string[];
      durationSec?: number;
      sarvamUploaded?: boolean;
      offsetsMs?: Record<string, number>;
    };

    const tracks = new Set(body.tracks ?? []);

    // Fold the measured per-track start offsets into the file map written at
    // upload-urls time. The two recorders do not start at the same instant, and
    // each Sarvam transcript is timed from its own file — the merge shifts by
    // these rather than assuming a shared origin.
    const existingFiles = Array.isArray(meeting.transcriptFiles)
      ? (meeting.transcriptFiles as { index: number; track: string; fileName: string }[])
      : [];
    const transcriptFiles = existingFiles.map((f) => ({
      ...f,
      offsetMs: Math.max(0, Math.round(body.offsetsMs?.[f.track] ?? 0)),
    }));

    // Only start transcription when the audio really reached Sarvam AND a job
    // exists. A job started with no files sits Failed and looks like our bug.
    const canTranscribe = Boolean(meeting.transcriptJobId) && body.sarvamUploaded === true;

    // Preserve whatever went wrong earlier (e.g. the Sarvam job could not be
    // created at upload-urls time). Blanking it here made a failed setup look
    // like a call that simply had no transcription requested.
    let transcriptError: string | null = meeting.transcriptError;
    if (canTranscribe) transcriptError = null;
    else if (!transcriptError && !meeting.transcriptJobId) {
      transcriptError = "Transcription was not started for this call";
    } else if (!transcriptError && body.sarvamUploaded !== true) {
      transcriptError = "Audio did not reach the transcription service";
    }

    if (canTranscribe) {
      try {
        await startBatchJob(meeting.transcriptJobId as string);
      } catch (err) {
        console.error("[meetings] Sarvam start failed:", err);
        transcriptError = err instanceof Error ? err.message : "Could not start transcription";
      }
    }

    const updated = await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        endsAt: new Date(),
        status: "RECORDED",
        durationSec:
          typeof body.durationSec === "number" && body.durationSec > 0
            ? Math.round(body.durationSec)
            : null,
        tabRecordingKey: tracks.has("tab") ? await recordingKey(meeting.id, "tab") : null,
        micRecordingKey: tracks.has("mic") ? await recordingKey(meeting.id, "mic") : null,
        ...(transcriptFiles.length > 0 ? { transcriptFiles } : {}),
        transcriptStatus: canTranscribe && !transcriptError ? "RUNNING" : "IDLE",
        transcriptError,
      },
      select: { id: true, transcriptStatus: true },
    });

    return NextResponse.json({ success: true, data: updated }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("Meeting complete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
