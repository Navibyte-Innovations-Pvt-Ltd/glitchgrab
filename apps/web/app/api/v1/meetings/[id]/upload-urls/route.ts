export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findScopedMeeting, resolveMeetingCaller } from "@/lib/meetings";
import { presignRecordingUpload, type RecordingTrack } from "@/lib/recordings";
import { createBatchJob, getUploadTargets } from "@/lib/sarvam/batch";

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
 * POST /api/v1/meetings/:id/upload-urls
 *
 * Hands the extension everywhere it needs to PUT the audio it is already
 * holding: our own S3 (the copy we keep forever) and — when transcription is
 * wanted — Sarvam's Azure SAS urls for the same bytes.
 *
 * The extension uploads to both directly. Neither file passes through this
 * function: a serverless request body limit and a ~300s duration cap will not
 * survive a few hundred megabytes at the end of a long call, and a failed
 * upload there means a lost client conversation.
 *
 * Body: { tracks: ["tab", "mic"], transcribe?: boolean, numSpeakers?: number }
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
      transcribe?: boolean;
      numSpeakers?: number;
    };

    const tracks = (body.tracks ?? []).filter(
      (t): t is RecordingTrack => t === "tab" || t === "mic"
    );
    if (tracks.length === 0) {
      return NextResponse.json(
        { success: false, error: "tracks must include 'tab' and/or 'mic'" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const s3 = await Promise.all(
      tracks.map(async (track) => ({ track, ...(await presignRecordingUpload(meeting.id, track)) }))
    );

    // Sarvam is best-effort at this stage. If the key is missing or the API is
    // down we still return the S3 urls — losing transcription is recoverable,
    // losing the recording is not.
    let sarvam: { track: RecordingTrack; fileName: string; uploadUrl: string }[] = [];
    let jobId: string | null = null;

    if (body.transcribe !== false) {
      try {
        jobId = await createBatchJob({
          withDiarization: true,
          numSpeakers: body.numSpeakers,
        });
        // File name encodes the track, which is how the result is attributed to
        // a speaker later — Sarvam returns results keyed by these names.
        const targets = await getUploadTargets(
          jobId,
          tracks.map((t) => `${t}.webm`)
        );
        sarvam = targets.map((t) => ({
          track: t.fileName.startsWith("mic") ? "mic" : "tab",
          fileName: t.fileName,
          uploadUrl: t.uploadUrl,
        }));
      } catch (err) {
        console.error("[meetings] Sarvam job setup failed:", err);
        jobId = null;
        sarvam = [];
      }
    }

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        transcriptJobId: jobId,
        // Order matters more than it looks: Sarvam names results positionally
        // ("0.json"), so this array is the only link from a result back to a
        // speaker. Without it both tracks collapse to one label.
        transcriptFiles: sarvam.map((s, index) => ({
          index,
          track: s.track,
          fileName: s.fileName,
          offsetMs: 0,
        })),
        ...(jobId ? {} : { transcriptError: "Could not reach Sarvam when starting the job" }),
      },
    });

    return NextResponse.json(
      { success: true, data: { s3, sarvam, jobId } },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Meeting upload-urls error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
