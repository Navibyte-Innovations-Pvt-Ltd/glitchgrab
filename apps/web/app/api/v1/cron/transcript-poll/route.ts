export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { collectMeetingTranscript, failStaleTranscripts } from "@/lib/sarvam/collect";

/** Sarvam status checks are cheap, but a runaway backlog shouldn't blow the run. */
const BATCH = 20;

/**
 * GET /api/v1/cron/transcript-poll
 *
 * Sarvam is asynchronous and tells us nothing when it finishes, so someone has
 * to ask. Until now the only asker was a signed-in dashboard tab: the meetings
 * list and the detail page both nudge the job along. That means a call recorded
 * at 10pm stayed "transcribing…" until a human happened to open the page —
 * and the two jobs that mattered sat there for days.
 *
 * This closes the loop, and sweeps up jobs that will never finish.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const running = await prisma.meeting.findMany({
    where: { transcriptStatus: "RUNNING" },
    select: { id: true },
    orderBy: { updatedAt: "asc" },
    take: BATCH,
  });

  const outcomes = await Promise.all(
    running.map((m) =>
      collectMeetingTranscript(m.id).catch((err) => {
        console.error(`[cron] transcript poll failed for ${m.id}:`, err);
        return { status: "RUNNING" as const };
      })
    )
  );

  // After the poll, not before: a job that finished on this very run must not
  // be failed for being old.
  const staled = await failStaleTranscripts();

  return NextResponse.json({
    success: true,
    data: {
      polled: running.length,
      done: outcomes.filter((o) => o.status === "DONE").length,
      failed: outcomes.filter((o) => o.status === "FAILED").length,
      staled,
    },
  });
}
