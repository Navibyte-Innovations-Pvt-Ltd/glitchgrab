export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGitHubOrgMembers } from "@/lib/github";
import { getInstallationAccessToken } from "@/lib/github-app";

interface RepoStat { name: string; commits: number; branches: string[]; prs: number }
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

  const installation = await prisma.installation.findFirst({
    where: { accountLogin: org.githubOrgLogin },
  });
  if (!installation) return NextResponse.json({ success: true, data: {} });

  const token = await getInstallationAccessToken(installation.installationId);

  const [githubMembers, repos] = await Promise.all([
    getGitHubOrgMembers(token, org.githubOrgLogin),
    prisma.repo.findMany({ where: { orgId: org.id }, select: { fullName: true } }),
  ]);

  if (githubMembers.length === 0 || repos.length === 0) {
    return NextResponse.json({ success: true, data: {} });
  }

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // login → repoShort → { shas: SHA set, branches: branch name set }
  const perRepo: Record<string, Record<string, { shas: Set<string>; branches: Set<string> }>> = {};

  interface Branch { name: string }
  interface Commit { sha: string; author: { login?: string } | null; commit: { author: { date: string } } }

  await Promise.all(
    repos.map(async (repo: { fullName: string }) => {
      try {
        const branchRes = await fetch(`https://api.github.com/repos/${repo.fullName}/branches?per_page=100`, { headers: ghHeaders });
        if (!branchRes.ok) return;
        const branches = (await branchRes.json()) as Branch[];
        if (!Array.isArray(branches)) return;

        const repoShort = repo.fullName.split("/")[1] ?? repo.fullName;

        await Promise.all(
          branches.flatMap((branch) =>
            githubMembers.map(async (member) => {
              try {
                const url = `https://api.github.com/repos/${repo.fullName}/commits?sha=${encodeURIComponent(branch.name)}&author=${member.login}&since=${sinceIso}&per_page=100`;
                const res = await fetch(url, { headers: ghHeaders });
                if (!res.ok) return;
                const commits = (await res.json()) as Commit[];
                if (!Array.isArray(commits) || commits.length === 0) return;

                perRepo[member.login] ??= {};
                perRepo[member.login][repoShort] ??= { shas: new Set(), branches: new Set() };
                const entry = perRepo[member.login][repoShort];
                let added = false;
                for (const c of commits) {
                  if (!entry.shas.has(c.sha)) {
                    entry.shas.add(c.sha);
                    added = true;
                  }
                }
                if (added) entry.branches.add(branch.name);
              } catch {
                // fail silently
              }
            })
          )
        );
      } catch {
        // fail silently
      }
    })
  );

  // PRs created today per member across org repos
  const prPerMember: Record<string, Record<string, number>> = {};
  const todayDate = sinceIso.split("T")[0];

  await Promise.all(
    githubMembers.map(async (member) => {
      try {
        const url = `https://api.github.com/search/issues?q=type:pr+org:${org.githubOrgLogin}+author:${member.login}+created:>=${todayDate}&per_page=100`;
        const res = await fetch(url, { headers: ghHeaders });
        if (!res.ok) return;
        const json = (await res.json()) as { items?: { repository_url: string }[] };
        if (!Array.isArray(json.items)) return;
        for (const item of json.items) {
          const repoShort = item.repository_url.split("/").at(-1) ?? "";
          prPerMember[member.login] ??= {};
          prPerMember[member.login][repoShort] = (prPerMember[member.login][repoShort] ?? 0) + 1;
        }
      } catch {
        // fail silently
      }
    })
  );

  const data: Record<string, MemberStat> = {};

  const allLogins = new Set([...Object.keys(perRepo), ...Object.keys(prPerMember)]);

  for (const login of allLogins) {
    const repoMap = perRepo[login] ?? {};
    const prMap = prPerMember[login] ?? {};
    const allRepoNames = new Set([...Object.keys(repoMap), ...Object.keys(prMap)]);

    const repos = Array.from(allRepoNames)
      .map((name) => ({
        name,
        commits: repoMap[name]?.shas.size ?? 0,
        branches: Array.from(repoMap[name]?.branches ?? []).sort(),
        prs: prMap[name] ?? 0,
      }))
      .sort((a, b) => b.commits - a.commits);

    data[login] = { commits: repos.reduce((s, r) => s + r.commits, 0), repos };
  }

  return NextResponse.json({ success: true, data });
}
