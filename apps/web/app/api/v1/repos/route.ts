export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: Request) {
  // Auth: GlitchRecord desktop Bearer token OR dashboard session
  let userId: string | undefined;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const tokenHash = hashToken(authHeader.replace("Bearer ", ""));
    const record = await prisma.glitchRecordToken.findUnique({
      where: { tokenHash },
      select: { userId: true, expiresAt: true },
    });
    if (record && record.expiresAt > new Date()) userId = record.userId;
  } else {
    const session = await auth();
    userId = session?.user?.id;
  }

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401, headers: CORS }
    );
  }

  const repos = await prisma.repo.findMany({
    where: { userId },
    include: { _count: { select: { tokens: true, reports: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        ownRepos: repos.map((r: { id: string; githubId: number; fullName: string; isPrivate: boolean; _count: { tokens: number; reports: number } }) => ({
          id: r.id,
          githubId: r.githubId,
          fullName: r.fullName,
          isPrivate: r.isPrivate,
          tokens: r._count.tokens,
          reports: r._count.reports,
        })),
        sharedRepos: [],
      },
    },
    { headers: CORS }
  );
}
