export const dynamic = "force-dynamic";

// Dashboard "Tester Activity" audit view (#297): per-tester total logged-in
// work time (sum of ExtensionSession durations) + bug count (Report rows with
// source=EXTENSION_TESTER), across every repo the dashboard user owns.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aggregateTesterActivity } from "./aggregate";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const repos = await prisma.repo.findMany({ where: { userId }, select: { id: true } });
  const repoIds = repos.map((r) => r.id);
  if (repoIds.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  const sessions = await prisma.extensionSession.findMany({
    where: { repoId: { in: repoIds } },
    select: { testerName: true, testerEmail: true, startedAt: true, lastPingAt: true, endedAt: true },
  });

  const reportCounts = await prisma.report.groupBy({
    by: ["reporterEmail", "reporterName"],
    where: { repoId: { in: repoIds }, source: "EXTENSION_TESTER" },
    _count: { _all: true },
  });

  const data = aggregateTesterActivity(
    sessions,
    reportCounts.map((r) => ({
      reporterName: r.reporterName,
      reporterEmail: r.reporterEmail,
      count: r._count._all,
    }))
  );
  return NextResponse.json({ success: true, data });
}
