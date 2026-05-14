export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  const org = await prisma.organization.findUnique({ where: { githubOrgLogin: slug } });
  if (!org) return NextResponse.json({ success: false, error: "Org not found" }, { status: 404 });

  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ success: false, error: "Not a member" }, { status: 403 });

  const repos = await prisma.repo.findMany({
    where: { orgId: org.id },
    select: { id: true },
  });
  const repoIds = repos.map((r) => r.id);

  if (repoIds.length === 0) {
    return NextResponse.json({
      success: true,
      data: { total: 0, avgPerDay: 0, today: 0, failed: 0 },
    });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setUTCDate(startDate.getUTCDate() - 364);

  const [aggregated, failedCount, todayCount] = await Promise.all([
    prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM "Report"
      WHERE "repoId" = ANY(${repoIds}::text[]) AND "createdAt" >= ${startDate}
    `),
    prisma.report.count({
      where: {
        repoId: { in: repoIds },
        status: "FAILED",
        NOT: { metadata: { path: ["dismissed"], equals: true } },
      },
    }),
    prisma.report.count({
      where: {
        repoId: { in: repoIds },
        createdAt: { gte: today },
      },
    }),
  ]);

  const total = Number(aggregated[0]?.count ?? 0);
  const avgPerDay = Math.round((total / 365) * 10) / 10;

  return NextResponse.json({
    success: true,
    data: { total, avgPerDay, today: todayCount, failed: failedCount },
  });
}
