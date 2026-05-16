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

  // login → repoShort → sha set (search API covers ALL branches; dedupe by SHA)
  const perRepo: Record<string, Record<string, Set<string>>> = {};
  const repoFilter = repos.map((r) => `repo:${r.fullName}`).join("+");

  await Promise.all(
    githubMembers.map(async (member) => {
      try {
        const q = `author:${member.login}+author-date:>=${sinceIso}+${repoFilter}`;
        const url = `https://api.github.com/search/commits?q=${q}&per_page=100`;
        const res = await fetch(url, { headers: ghHeaders });
        if (!res.ok) return;
        const json = (await res.json()) as { items?: Array<{ sha: string; repository: { full_name: string } }> };
        if (!Array.isArray(json.items) || json.items.length === 0) return;

        perRepo[member.login] ??= {};
        for (const item of json.items) {
          const repoShort = item.repository.full_name.split("/")[1] ?? item.repository.full_name;
          perRepo[member.login][repoShort] ??= new Set();
          perRepo[member.login][repoShort].add(item.sha);
        }
      } catch {
        // fail silently
      }
    })
  );

  const data: Record<string, MemberStat> = {};
  for (const [login, repoMap] of Object.entries(perRepo)) {
    const repos = Object.entries(repoMap)
      .map(([name, shas]) => ({ name, commits: shas.size }))
      .sort((a, b) => b.commits - a.commits);
    data[login] = { commits: repos.reduce((s, r) => s + r.commits, 0), repos };
  }

  return NextResponse.json({ success: true, data });
}
