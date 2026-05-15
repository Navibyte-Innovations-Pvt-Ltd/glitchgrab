export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const repos = await prisma.repo.findMany({
    where: { userId },
    include: { _count: { select: { tokens: true, reports: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: {
      ownRepos: repos.map((r) => ({
        id: r.id,
        githubId: r.githubId,
        fullName: r.fullName,
        isPrivate: r.isPrivate,
        tokens: r._count.tokens,
        reports: r._count.reports,
      })),
      sharedRepos: [],
    },
  });
}
