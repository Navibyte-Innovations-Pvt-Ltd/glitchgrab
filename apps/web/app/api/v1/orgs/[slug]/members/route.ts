export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGitHubOrgMembers } from "@/lib/github";

// GET — returns GitHub org members merged with DB OrgMember state
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  const org = await prisma.organization.findUnique({ where: { githubOrgLogin: slug } });
  if (!org) return NextResponse.json({ success: false, error: "Org not found" }, { status: 404 });

  const requester = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: session.user.id } },
  });
  if (!requester) return NextResponse.json({ success: false, error: "Not a member" }, { status: 403 });

  const account = await prisma.account.findFirst({
    where: { userId: org.ownerId, provider: "github" },
    select: { access_token: true },
  });

  // Fetch GitHub org members
  const githubMembers = account?.access_token
    ? await getGitHubOrgMembers(account.access_token, org.githubOrgLogin)
    : [];

  // Fetch registered OrgMembers with user data
  const dbMembers = await prisma.orgMember.findMany({
    where: { orgId: org.id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, githubLogin: true } },
      repos: { include: { repo: { select: { id: true, fullName: true, name: true } } } },
    },
  });

  // Build a map: githubLogin → dbMember
  const dbByLogin = new Map(
    dbMembers
      .filter((m) => m.user.githubLogin)
      .map((m) => [m.user.githubLogin!, m])
  );

  // Merge: all GitHub members, annotated with DB state
  const merged = githubMembers.map((ghm) => {
    const db = dbByLogin.get(ghm.login);
    return {
      githubLogin: ghm.login,
      avatarUrl: ghm.avatarUrl,
      // DB fields if they've signed in
      orgMemberId: db?.id ?? null,
      name: db?.user.name ?? null,
      email: db?.user.email ?? null,
      role: db?.role ?? null,
      repos: db?.repos ?? [],
      joined: !!db,
    };
  });

  // Add any DB members whose githubLogin isn't in the GitHub list (edge case)
  const githubLogins = new Set(githubMembers.map((m) => m.login));
  for (const db of dbMembers) {
    if (!db.user.githubLogin || !githubLogins.has(db.user.githubLogin)) {
      merged.push({
        githubLogin: db.user.githubLogin ?? "",
        avatarUrl: db.user.image ?? "",
        orgMemberId: db.id,
        name: db.user.name,
        email: db.user.email,
        role: db.role,
        repos: db.repos,
        joined: true,
      });
    }
  }

  return NextResponse.json({ success: true, data: { members: merged, total: merged.length } });
}
