export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveMeetingCaller, scopeRepo } from "@/lib/meetings";
import { collectMeetingTranscript } from "@/lib/sarvam/collect";

const CORS_HEADERS = {
  // The extension calls this from a background service worker, which sends
  // Origin: chrome-extension://<id>. Mirrors the existing capture-sessions route.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-gg-session",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST /api/v1/meetings — open a recording.
 *
 * Called the moment the operator presses record, BEFORE any audio exists, so
 * the meeting row (and therefore the S3 key) is known up front and a crash
 * mid-call still leaves a record of what was being recorded.
 */
export async function POST(request: Request) {
  try {
    const caller = await resolveMeetingCaller(request);
    if (!caller) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      repoId?: string;
      title?: string;
      meetUrl?: string;
    };

    const repo = scopeRepo(caller, body.repoId);
    if (!repo) {
      return NextResponse.json(
        { success: false, error: "Pick a project you have access to" },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const meeting = await prisma.meeting.create({
      data: {
        repoId: repo.id,
        title: body.title?.trim() || null,
        meetUrl: body.meetUrl?.trim() || null,
        startsAt: new Date(),
        status: "RECORDING",
        createdById: caller.userId,
      },
      select: { id: true, repoId: true, startsAt: true },
    });

    return NextResponse.json(
      { success: true, data: { ...meeting, repoFullName: repo.fullName } },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Meeting create error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

/** GET /api/v1/meetings — recorded calls across every project in scope. */
export async function GET(request: Request) {
  try {
    const caller = await resolveMeetingCaller(request);
    if (!caller) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    if (caller.repos.length === 0) {
      return NextResponse.json({ success: true, data: [] }, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const repoIdParam = url.searchParams.get("repoId");
    const scoped = repoIdParam ? scopeRepo(caller, repoIdParam) : null;
    const repoIds = repoIdParam
      ? scoped
        ? [scoped.id]
        : []
      : caller.repos.map((r) => r.id);

    if (repoIds.length === 0) {
      return NextResponse.json({ success: true, data: [] }, { headers: CORS_HEADERS });
    }

    const names = new Map(caller.repos.map((r) => [r.id, r.fullName]));

    // Advance any in-flight transcription before reading. The list polls while
    // a job is RUNNING, so without this it would poll forever and only ever
    // finish if someone happened to open the detail page. Capped: a Sarvam
    // status check per running meeting, and only a handful are ever in flight.
    const running = await prisma.meeting.findMany({
      where: { repoId: { in: repoIds }, transcriptStatus: "RUNNING" },
      select: { id: true },
      take: 5,
    });
    if (running.length > 0) {
      await Promise.all(
        running.map((m) => collectMeetingTranscript(m.id).catch(() => {}))
      );
    }

    const meetings = await prisma.meeting.findMany({
      where: { repoId: { in: repoIds } },
      select: {
        id: true,
        repoId: true,
        title: true,
        startsAt: true,
        endsAt: true,
        durationSec: true,
        status: true,
        transcriptStatus: true,
        recorder: true,
        botStatus: true,
        botError: true,
        tabRecordingKey: true,
        micRecordingKey: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(
      {
        success: true,
        data: meetings.map((m) => ({
          ...m,
          repoFullName: names.get(m.repoId) ?? "",
          hasRecording: Boolean(m.tabRecordingKey || m.micRecordingKey),
          startsAt: m.startsAt?.toISOString() ?? null,
          endsAt: m.endsAt?.toISOString() ?? null,
          createdAt: m.createdAt.toISOString(),
        })),
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Meeting list error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
