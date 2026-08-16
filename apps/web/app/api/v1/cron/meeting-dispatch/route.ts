export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncCalendar } from "@/lib/calendar";
import { botAlreadyOnCall, startBotRecording } from "@/lib/meet-bot";

/**
 * Cron: send the bot to calls that are about to start (#311).
 *
 * This is the "never think about recording again" step — a demo in your Google
 * Calendar gets a bot without anyone pressing anything.
 *
 * Runs every 5 minutes, so the lead window has to be wider than that or a call
 * would slip between two runs and never be recorded.
 */

/** Join this far ahead so the bot is already knocking when the call opens. */
const LEAD_MINUTES = 6;

/**
 * Don't chase a call that started long ago: joining 40 minutes late records a
 * fragment and looks broken. A cron outage should skip, not backfill.
 */
const GRACE_MINUTES = 10;

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Refresh from Google first — a meeting booked twenty minutes ago must not be
  // missed just because the last sync predates it.
  const connections = await prisma.calendarConnection.findMany({
    where: { autoRecord: true },
    select: { id: true },
  });

  for (const connection of connections) {
    await syncCalendar(connection.id).catch((err) =>
      console.error("[meeting-dispatch] sync failed:", err)
    );
  }

  const now = Date.now();

  const due = await prisma.scheduledRecording.findMany({
    where: {
      status: "PENDING",
      // An unassigned call has no project to file the recording against, so it
      // is not dispatchable — the dashboard shows it as needing a project.
      repoId: { not: null },
      connection: { autoRecord: true },
      startsAt: {
        gte: new Date(now - GRACE_MINUTES * 60_000),
        lte: new Date(now + LEAD_MINUTES * 60_000),
      },
    },
    select: {
      id: true,
      repoId: true,
      meetUrl: true,
      title: true,
      startsAt: true,
      connection: { select: { userId: true } },
    },
    take: 10,
  });

  let dispatched = 0;
  let failed = 0;

  for (const call of due) {
    // Claim it BEFORE dispatching. Two overlapping cron runs would otherwise
    // both see PENDING and send two bots to the same meeting — the client would
    // watch two notetakers join.
    const claimed = await prisma.scheduledRecording.updateMany({
      where: { id: call.id, status: "PENDING" },
      data: { status: "DISPATCHED" },
    });
    if (claimed.count === 0) continue;

    try {
      // The same link may have been sent by hand from the dashboard. Claiming
      // the row stops two crons colliding; this stops the two paths colliding.
      if (await botAlreadyOnCall(call.meetUrl)) {
        await prisma.scheduledRecording.update({
          where: { id: call.id },
          data: { error: "A bot was already on this call" },
        });
        continue;
      }

      const { meetingId, dispatch } = await startBotRecording({
        repoId: call.repoId as string,
        meetUrl: call.meetUrl,
        title: call.title,
        userId: call.connection.userId,
        startsAt: call.startsAt,
      });

      await prisma.scheduledRecording.update({
        where: { id: call.id },
        data: {
          meetingId,
          ...(dispatch.ok
            ? { error: null }
            : { status: "FAILED", error: dispatch.error?.slice(0, 500) }),
        },
      });

      if (dispatch.ok) dispatched++;
      else failed++;
    } catch (err) {
      failed++;
      await prisma.scheduledRecording.update({
        where: { id: call.id },
        data: {
          status: "FAILED",
          error: err instanceof Error ? err.message.slice(0, 500) : "Dispatch failed",
        },
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: { connections: connections.length, due: due.length, dispatched, failed },
  });
}
