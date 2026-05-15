export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGitHubOrgMembers } from "@/lib/github";

interface RepoStat { name: string; commits: number }
interface MemberStat { commits: number; repos: RepoStat[] }

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
  if (!account?.access_token) return NextResponse.json({ success: true, data: {} });

  const [githubMembers, repos] = await Promise.all([
    getGitHubOrgMembers(account.access_token, org.githubOrgLogin),
    prisma.repo.findMany({ where: { orgId: org.id }, select: { fullName: true } }),
  ]);

  if (githubMembers.length === 0 || repos.length === 0) {
    return NextResponse.json({ success: true, data: {} });
  }

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const ghHeaders = {
    Authorization: `Bearer ${account.access_token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // login → repoShort → count
  const perRepo: Record<string, Record<string, number>> = {};

  await Promise.all(
    githubMembers.flatMap((member) =>
      repos.map(async (repo) => {
        try {
          const url = `https://api.github.com/repos/${repo.fullName}/commits?author=${member.login}&since=${sinceIso}&per_page=100`;
          const res = await fetch(url, { headers: ghHeaders });
          if (!res.ok) return;
          const commits = (await res.json()) as unknown[];
          if (!Array.isArray(commits) || commits.length === 0) return;

          const repoShort = repo.fullName.split("/")[1] ?? repo.fullName;
          perRepo[member.login] ??= {};
          perRepo[member.login][repoShort] = (perRepo[member.login][repoShort] ?? 0) + commits.length;
        } catch {
          // fail silently
        }
      })
    )
  );

  const data: Record<string, MemberStat> = {};
  for (const [login, repoMap] of Object.entries(perRepo)) {
    const repos = Object.entries(repoMap)
      .map(([name, commits]) => ({ name, commits }))
      .sort((a, b) => b.commits - a.commits);
    data[login] = { commits: repos.reduce((s, r) => s + r.commits, 0), repos };
  }

  return NextResponse.json({ success: true, data });
}
