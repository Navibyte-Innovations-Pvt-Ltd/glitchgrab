export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveMeetingCaller } from "@/lib/meetings";
import { findActiveBotMeeting } from "@/lib/meet-bot";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-gg-session",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/v1/meetings/resolve?meetUrl=…
 *
 * Which project does this call belong to? Powers the in-Meet pill so the
 * operator doesn't pick a project seconds before a client call — the moment
 * they are least able to think about it, and the moment a wrong pick files a
 * client conversation against the wrong customer.
 *
 * Order of confidence:
 *   1. The call is in the connected Google Calendar with a project assigned.
 *   2. Nothing matched — the caller falls back to whatever they used last.
 *
 * Always returns the full repo list so the pill can offer an override.
 */
export async function GET(request: Request) {
  try {
    const caller = await resolveMeetingCaller(request);
    if (!caller || caller.isBot) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const meetUrl = (new URL(request.url).searchParams.get("meetUrl") ?? "").trim();
    const repos = caller.repos;

    let suggested: { repoId: string; repoFullName: string; source: string } | null = null;

    /**
     * A recording already running on this call.
     *
     * The in-Meet button keeps its state in the page, so reloading the tab —
     * or opening the call in a second tab — used to forget that a bot was
     * already in the room and ask again from scratch. Worse than noise: the
     * obvious response is to pick a project, which is a request for a SECOND
     * bot in front of the client.
     */
    let active: {
      meetingId: string;
      /** Null when the recording is unfiled — recorded first, filed later. */
      repoId: string | null;
      repoFullName: string;
      botStatus: string | null;
    } | null = null;

    if (meetUrl) {
      // Same definition the duplicate check uses, so the button can never show
      // "nothing running" while the server refuses to start anything.
      const running = await findActiveBotMeeting(
        meetUrl,
        repos.map((r) => r.id)
      );

      if (running) {
        active = {
          meetingId: running.id,
          repoId: running.repoId,
          repoFullName:
            repos.find((r) => r.id === running.repoId)?.fullName ?? "No project yet",
          botStatus: running.botStatus,
        };
      }
    }

    if (meetUrl && caller.userId) {
      const scheduled = await prisma.scheduledRecording.findFirst({
        where: {
          meetUrl,
          repoId: { not: null },
          connection: { userId: caller.userId },
        },
        select: { repoId: true, title: true },
        orderBy: { startsAt: "desc" },
      });

      // Only trust it if the repo is still in the caller's scope — a stale
      // calendar row must never widen access.
      const match = scheduled?.repoId
        ? repos.find((r) => r.id === scheduled.repoId)
        : undefined;

      if (match) {
        suggested = {
          repoId: match.id,
          repoFullName: match.fullName,
          source: "calendar",
        };
      }
    }

    return NextResponse.json(
      { success: true, data: { repos, suggested, active } },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Meeting resolve error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
