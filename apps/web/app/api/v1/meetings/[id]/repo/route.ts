export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findScopedMeeting, resolveMeetingCaller, scopeRepo } from "@/lib/meetings";

type RouteParams = { params: Promise<{ id: string }> };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-gg-session",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * PATCH /api/v1/meetings/:id/repo — re-file a recording under another project.
 *
 * Picking the wrong project takes a second in the rush before a call and is
 * expensive to notice afterwards. Re-filing changes only where the recording
 * lands: the bot is never told, never leaves, and the audio is not interrupted,
 * so the client sees nothing at all.
 *
 * The bot is refused outright (`scopeRepo` returns null for it) and both the
 * current and the new repo must be in the caller's own scope — so this can
 * never move someone else's client conversation into your project, or yours
 * into theirs.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const caller = await resolveMeetingCaller(request);
    if (!caller || caller.isBot) {
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

    const body = (await request.json().catch(() => ({}))) as { repoId?: string };
    const repo = scopeRepo(caller, body.repoId);
    if (!repo) {
      return NextResponse.json(
        { success: false, error: "Pick a project you have access to" },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    if (repo.id !== meeting.repoId) {
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { repoId: repo.id },
      });
    }

    return NextResponse.json(
      { success: true, data: { id: meeting.id, repoId: repo.id, repoFullName: repo.fullName } },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Meeting re-file error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
