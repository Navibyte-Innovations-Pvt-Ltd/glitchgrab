export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGitHubOrgInfo, getOrgRepos } from "@/lib/github";

// GET /api/v1/orgs — get the org the current user owns or belongs to
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.orgMember.findFirst({
    where: { userId: session.user.id },
    include: { org: true },
  });

  return NextResponse.json({ success: true, data: membership ?? null });
}

// POST /api/v1/orgs — create org by connecting GitHub org login
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { githubOrgLogin } = (await request.json()) as { githubOrgLogin: string };
  if (!githubOrgLogin?.trim()) {
    return NextResponse.json({ success: false, error: "githubOrgLogin required" }, { status: 400 });
  }

  // Check user doesn't already own an org
  const existing = await prisma.organization.findFirst({ where: { ownerId: session.user.id } });
  if (existing) {
    return NextResponse.json({ success: false, error: "Already have an org" }, { status: 409 });
  }

  // Get GitHub access token
  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "github" },
    select: { access_token: true },
  });
  if (!account?.access_token) {
    return NextResponse.json({ success: false, error: "No GitHub token" }, { status: 400 });
  }

  // Verify org exists on GitHub + get id
  const orgInfo = await getGitHubOrgInfo(account.access_token, githubOrgLogin.trim());
  if (!orgInfo) {
    return NextResponse.json(
      { success: false, error: "GitHub org not found or no access" },
      { status: 404 }
    );
  }

  // Create org + add owner as OWNER member
  const org = await prisma.organization.create({
    data: {
      githubOrgLogin: orgInfo.login,
      githubOrgId: orgInfo.id,
      name: orgInfo.name,
      ownerId: session.user.id,
      members: {
        create: { userId: session.user.id, role: "OWNER" },
      },
    },
  });

  // Sync all org repos
  const githubRepos = await getOrgRepos(account.access_token, orgInfo.login);
  const userId = session.user!.id as string;
  if (githubRepos.length > 0) {
    await Promise.all(
      githubRepos.map((r) =>
        prisma.repo.upsert({
          where: { userId_githubId: { userId, githubId: r.id } },
          create: {
            userId,
            orgId: org.id,
            githubId: r.id,
            fullName: r.fullName,
            owner: r.owner,
            name: r.name,
            isPrivate: r.isPrivate,
          },
          update: { orgId: org.id },
        })
      )
    );
  }

  return NextResponse.json({ success: true, data: { org, repoCount: githubRepos.length } });
}
