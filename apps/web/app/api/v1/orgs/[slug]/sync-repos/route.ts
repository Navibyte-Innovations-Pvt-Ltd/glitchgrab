export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrgRepos } from "@/lib/github";

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  const org = await prisma.organization.findUnique({ where: { githubOrgLogin: slug } });
  if (!org) return NextResponse.json({ success: false, error: "Org not found" }, { status: 404 });

  // Only OWNER can sync
  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: session.user.id } },
  });
  if (!member || member.role !== "OWNER") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "github" },
    select: { access_token: true },
  });
  if (!account?.access_token) {
    return NextResponse.json({ success: false, error: "No GitHub token" }, { status: 400 });
  }

  const githubRepos = await getOrgRepos(account.access_token, org.githubOrgLogin);
  let synced = 0;
  for (const r of githubRepos) {
    await prisma.repo.upsert({
      where: { userId_githubId: { userId: org.ownerId, githubId: r.id } },
      create: {
        userId: org.ownerId,
        orgId: org.id,
        githubId: r.id,
        fullName: r.fullName,
        owner: r.owner,
        name: r.name,
        isPrivate: r.isPrivate,
      },
      update: { orgId: org.id },
    });
    synced++;
  }

  return NextResponse.json({ success: true, data: { synced } });
}
