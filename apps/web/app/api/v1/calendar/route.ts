export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncCalendar } from "@/lib/calendar";
import { getAccessibleRepos } from "@/lib/repo-access";

/**
 * GET /api/v1/calendar — connected calendars plus the upcoming calls we can
 * record, each with whichever project it's assigned to.
 *
 * `?sync=1` refreshes from Google first.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const connections = await prisma.calendarConnection.findMany({
      where: { userId },
      select: {
        id: true,
        googleEmail: true,
        autoRecord: true,
        defaultRepoId: true,
        lastSyncAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (new URL(request.url).searchParams.get("sync")) {
      await Promise.all(connections.map((c) => syncCalendar(c.id).catch(() => 0)));
    }

    const upcoming =
      connections.length > 0
        ? await prisma.scheduledRecording.findMany({
            where: {
              connectionId: { in: connections.map((c) => c.id) },
              startsAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
            },
            orderBy: { startsAt: "asc" },
            take: 50,
          })
        : [];

    const repos = await getAccessibleRepos(userId);
    const repoNames = new Map(repos.map((r) => [r.id, r.fullName]));

    return NextResponse.json({
      success: true,
      data: {
        connections: connections.map((c) => ({
          ...c,
          lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
        })),
        repos: repos.map((r) => ({ id: r.id, fullName: r.fullName })),
        upcoming: upcoming.map((u) => ({
          id: u.id,
          title: u.title,
          meetUrl: u.meetUrl,
          startsAt: u.startsAt.toISOString(),
          endsAt: u.endsAt?.toISOString() ?? null,
          repoId: u.repoId,
          repoFullName: u.repoId ? (repoNames.get(u.repoId) ?? "") : "",
          status: u.status,
          meetingId: u.meetingId,
          error: u.error,
          attendees: u.attendees,
        })),
      },
    });
  } catch (error) {
    console.error("Calendar fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/calendar — assign a project to an upcoming call, skip one, or
 * flip a connection's auto-record switch.
 *
 * Body: { scheduledId, repoId } | { scheduledId, status } | { connectionId, autoRecord, defaultRepoId }
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      scheduledId?: string;
      repoId?: string | null;
      status?: string;
      connectionId?: string;
      autoRecord?: boolean;
      defaultRepoId?: string | null;
    };

    // A repo the caller cannot access must never become a recording target —
    // the bot would happily file a client call against someone else's project.
    const allowed = new Set((await getAccessibleRepos(userId)).map((r) => r.id));

    if (body.connectionId) {
      const connection = await prisma.calendarConnection.findFirst({
        where: { id: body.connectionId, userId },
        select: { id: true },
      });
      if (!connection) {
        return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
      }

      if (body.defaultRepoId && !allowed.has(body.defaultRepoId)) {
        return NextResponse.json({ success: false, error: "No access to that project" }, { status: 403 });
      }

      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: {
          ...(typeof body.autoRecord === "boolean" ? { autoRecord: body.autoRecord } : {}),
          ...(body.defaultRepoId !== undefined ? { defaultRepoId: body.defaultRepoId } : {}),
        },
      });

      return NextResponse.json({ success: true, data: { id: connection.id } });
    }

    if (!body.scheduledId) {
      return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });
    }

    const scheduled = await prisma.scheduledRecording.findFirst({
      where: { id: body.scheduledId, connection: { userId } },
      select: { id: true, status: true },
    });
    if (!scheduled) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    // Once the bot has gone, the assignment is history — changing it would
    // describe the recording wrongly rather than move it.
    if (scheduled.status === "DISPATCHED") {
      return NextResponse.json(
        { success: false, error: "This call has already been recorded" },
        { status: 409 }
      );
    }

    if (body.repoId && !allowed.has(body.repoId)) {
      return NextResponse.json({ success: false, error: "No access to that project" }, { status: 403 });
    }

    await prisma.scheduledRecording.update({
      where: { id: scheduled.id },
      data: {
        ...(body.repoId !== undefined ? { repoId: body.repoId } : {}),
        ...(body.status === "SKIPPED" || body.status === "PENDING"
          ? { status: body.status }
          : {}),
      },
    });

    return NextResponse.json({ success: true, data: { id: scheduled.id } });
  } catch (error) {
    console.error("Calendar update error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
