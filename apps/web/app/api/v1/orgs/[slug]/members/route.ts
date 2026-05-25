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
    },
  });

  // For DB members with null githubLogin, look up from Account table and backfill
  for (const m of dbMembers) {
    if (!m.user.githubLogin) {
      const acc = await prisma.account.findFirst({
        where: { userId: m.user.id, provider: "github" },
        select: { access_token: true },
      });
      if (acc?.access_token) {
        const { getGitHubUserLogin } = await import("@/lib/github");
        const login = await getGitHubUserLogin(acc.access_token);
        if (login) {
          // Backfill into DB so next call is instant
          await prisma.user.update({ where: { id: m.user.id }, data: { githubLogin: login } });
          m.user.githubLogin = login;
        }
      }
    }
  }

  // Build a map: githubLogin → dbMember
  const dbByLogin = new Map(
    dbMembers
      .filter((m: typeof dbMembers[number]) => m.user.githubLogin)
      .map((m: typeof dbMembers[number]) => [m.user.githubLogin as string, m])
  );

  // Merge: all GitHub members, annotated with DB state
  const githubLogins = new Set(githubMembers.map((m) => m.login));
  const merged = githubMembers.map((ghm) => {
    const db = dbByLogin.get(ghm.login);
    return {
      githubLogin: ghm.login,
      avatarUrl: ghm.avatarUrl,
      name: db?.user.name ?? null,
      email: db?.user.email ?? null,
      role: db?.role ?? null,
      joined: !!db,
    };
  });

  // Add DB members whose githubLogin still isn't in GitHub list (edge case only)
  for (const db of dbMembers) {
    if (!db.user.githubLogin || !githubLogins.has(db.user.githubLogin)) {
      merged.push({
        githubLogin: db.user.githubLogin ?? "",
        avatarUrl: db.user.image ?? "",
        name: db.user.name,
        email: db.user.email,
        role: db.role,
        joined: true,
      });
    }
  }

  return NextResponse.json({ success: true, data: { members: merged, total: merged.length } });
}
