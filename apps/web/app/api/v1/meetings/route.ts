export const dynamic = "force-dynamic";


import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveMeetingCaller, scopeRepo } from "@/lib/meetings";
import { collectMeetingTranscript } from "@/lib/sarvam/collect";
import { fetchLiveBotPhases } from "@/lib/meet-bot";

/** Phases whose stored value goes stale while the bot is still getting in. */
const PRE_ADMIT_BADGES = ["DISPATCHING", "JOINING", "WAITING_ADMIT"];

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

    // No repos is not the same as nothing to show: unfiled recordings belong
    // to a person, not a project, so someone with no repos at all can still
    // have calls waiting to be filed.
    if (caller.repos.length === 0 && !caller.userId) {
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

    if (repoIdParam && repoIds.length === 0) {
      return NextResponse.json({ success: true, data: [] }, { headers: CORS_HEADERS });
    }

    const names = new Map(caller.repos.map((r) => [r.id, r.fullName]));

    // Advance any in-flight transcription before reading. The list polls while
    // a job is RUNNING, so without this it would poll forever and only ever
    // finish if someone happened to open the detail page. Capped: a Sarvam
    // status check per running meeting, and only a handful are ever in flight.
    const running = await prisma.meeting.findMany({
      where: {
        transcriptStatus: "RUNNING",
        OR: [
          { repoId: { in: repoIds } },
          ...(caller.userId ? [{ repoId: null, createdById: caller.userId }] : []),
        ],
      },
      select: { id: true },
      take: 5,
    });
    if (running.length > 0) {
      await Promise.all(
        running.map((m) => collectMeetingTranscript(m.id).catch(() => {}))
      );
    }

    const meetings = await prisma.meeting.findMany({
      // Plus this caller's own unfiled recordings, which have no repo to scope
      // by — they would otherwise be invisible the moment the call ended, with
      // no way to file them.
      where: repoIdParam
        ? { repoId: { in: repoIds } }
        : {
            OR: [
              { repoId: { in: repoIds } },
              ...(caller.userId ? [{ repoId: null, createdById: caller.userId }] : []),
            ],
          },
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

    // The stored botStatus only moves when the bot manages to call us, so a
    // row can still say "sending bot…" while the bot is already recording. Ask
    // the bot service directly for the rows that have not reached the call yet
    // — one request for the whole list, and it is what the badge is for.
    const livePhases = meetings.some(
      (m) => m.recorder === "bot" && PRE_ADMIT_BADGES.includes(m.botStatus ?? "")
    )
      ? await fetchLiveBotPhases()
      : new Map<string, string>();

    return NextResponse.json(
      {
        success: true,
        data: meetings.map((m) => ({
          ...m,
          botStatus:
            m.recorder === "bot" && PRE_ADMIT_BADGES.includes(m.botStatus ?? "")
              ? (livePhases.get(m.id) ?? m.botStatus)
              : m.botStatus,
          // Unfiled recordings show as such rather than as a blank project.
          repoFullName: m.repoId ? (names.get(m.repoId) ?? "") : "No project yet",
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
