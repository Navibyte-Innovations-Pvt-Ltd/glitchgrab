export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCollabSession } from "@/lib/collab-auth";

export async function GET() {
  const session = await auth();
  const collabSession = await getCollabSession();
  const userId = session?.user?.id;

  if (!userId && !collabSession) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const ownRepos = userId
    ? await prisma.repo.findMany({
        where: { userId },
        include: { _count: { select: { tokens: true, reports: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const sharedRepos = collabSession
    ? await prisma.collaboratorRepo.findMany({
        where: {
          collaborator: { id: collabSession.collaboratorId, status: "ACCEPTED" },
        },
        include: {
          repo: {
            include: { _count: { select: { tokens: true, reports: true } } },
          },
        },
      })
    : [];

  return NextResponse.json({
    success: true,
    data: {
      ownRepos: ownRepos.map((r) => ({
        id: r.id,
        githubId: r.githubId,
        fullName: r.fullName,
        isPrivate: r.isPrivate,
        tokens: r._count.tokens,
        reports: r._count.reports,
      })),
      sharedRepos: sharedRepos.map((cr) => ({
        id: cr.repo.id,
        githubId: cr.repo.githubId,
        fullName: cr.repo.fullName,
        isPrivate: cr.repo.isPrivate,
        tokens: cr.repo._count.tokens,
        reports: cr.repo._count.reports,
      })),
    },
  });
}
