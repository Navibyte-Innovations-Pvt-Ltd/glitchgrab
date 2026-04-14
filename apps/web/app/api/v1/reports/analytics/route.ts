export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCollabSession } from "@/lib/collab-auth";

const DAYS = 365;

export async function GET() {
  try {
    const session = await auth();
    const collabSession = await getCollabSession();
    const userId = session?.user?.id;

    if (!userId && !collabSession) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const repoIds: string[] = [];
    if (userId) {
      const repos = await prisma.repo.findMany({ where: { userId }, select: { id: true } });
      repoIds.push(...repos.map((r) => r.id));
    }
    if (collabSession) {
      const collabRepos = await prisma.collaboratorRepo.findMany({
        where: { collaborator: { id: collabSession.collaboratorId, status: "ACCEPTED" } },
        select: { repoId: true },
      });
      repoIds.push(...collabRepos.map((r) => r.repoId));
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setUTCDate(startDate.getUTCDate() - (DAYS - 1));

    const buckets: { date: string; count: number }[] = [];
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i);
      buckets.push({ date: d.toISOString().slice(0, 10), count: 0 });
    }

    if (repoIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { daily: buckets, total: 0, avgPerDay: 0, today: 0, failed: 0 },
      });
    }

    const [aggregated, failedCount] = await Promise.all([
      prisma.$queryRaw<{ day: Date; count: bigint }[]>(Prisma.sql`
        SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*) AS count
        FROM "Report"
        WHERE "repoId" = ANY(${repoIds}::text[]) AND "createdAt" >= ${startDate}
        GROUP BY day
      `),
      prisma.report.count({
        where: {
          repoId: { in: repoIds },
          status: "FAILED",
          NOT: { metadata: { path: ["dismissed"], equals: true } },
        },
      }),
    ]);

    const indexByDate = new Map(buckets.map((b, i) => [b.date, i]));
    let total = 0;
    for (const row of aggregated) {
      const key = new Date(row.day).toISOString().slice(0, 10);
      const idx = indexByDate.get(key);
      const count = Number(row.count);
      if (idx !== undefined) buckets[idx].count = count;
      total += count;
    }

    const avgPerDay = Math.round((total / DAYS) * 10) / 10;
    const todayKey = today.toISOString().slice(0, 10);
    const todayCount = buckets[indexByDate.get(todayKey) ?? DAYS - 1].count;

    return NextResponse.json({
      success: true,
      data: { daily: buckets, total, avgPerDay, today: todayCount, failed: failedCount },
    });
  } catch (error) {
    console.error("Fetch analytics error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
