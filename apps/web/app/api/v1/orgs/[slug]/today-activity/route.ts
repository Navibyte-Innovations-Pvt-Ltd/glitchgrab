export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getInstallationAccessToken } from "@/lib/github-app";

interface GithubBranch { name: string }
interface GithubCommit { sha: string }

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

  // Installation token — consistent access to org repos regardless of which member is viewing
  const installation = await prisma.installation.findFirst({
    where: { accountLogin: org.githubOrgLogin },
  });
  if (!installation) {
    return NextResponse.json({ success: true, data: {} });
  }

  const repos = await prisma.repo.findMany({
    where: { orgId: org.id },
    select: { fullName: true },
  });

  const members = await prisma.orgMember.findMany({
    where: { orgId: org.id },
    include: { user: { select: { githubLogin: true } } },
  });

  const logins = members
    .map((m: { user: { githubLogin: string | null } }) => m.user.githubLogin)
    .filter((l: string | null): l is string => !!l);

  if (logins.length === 0 || repos.length === 0) {
    return NextResponse.json({ success: true, data: {} });
  }

  // since = start of today UTC
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const headers = {
    Authorization: `Bearer ${await getInstallationAccessToken(installation.installationId)}`,
    Accept: "application/vnd.github+json",
  };

  // login → { shas, repos } — per-branch REST covers ALL branches, dedupe by SHA
  const counts: Record<string, { shas: Set<string>; repos: Set<string> }> = {};

  await Promise.all(
    repos.map(async (repo: { fullName: string }) => {
      try {
        const branchRes = await fetch(`https://api.github.com/repos/${repo.fullName}/branches?per_page=100`, { headers });
        if (!branchRes.ok) return;
        const branches = (await branchRes.json()) as GithubBranch[];
        if (!Array.isArray(branches)) return;

        const repoShort = repo.fullName.split("/")[1] ?? repo.fullName;

        await Promise.all(
          branches.flatMap((branch) =>
            logins.map(async (login: string) => {
              try {
                const url = `https://api.github.com/repos/${repo.fullName}/commits?sha=${encodeURIComponent(branch.name)}&author=${login}&since=${sinceIso}&per_page=100`;
                const res = await fetch(url, { headers });
                if (!res.ok) return;
                const commits = (await res.json()) as GithubCommit[];
                if (!Array.isArray(commits) || commits.length === 0) return;

                counts[login] ??= { shas: new Set(), repos: new Set() };
                for (const c of commits) counts[login].shas.add(c.sha);
                counts[login].repos.add(repoShort);
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

  const data = Object.fromEntries(
    Object.entries(counts)
      .filter(([, v]) => v.shas.size > 0)
      .map(([k, v]) => [k, { commits: v.shas.size, repos: Array.from(v.repos) }])
  );

  return NextResponse.json({ success: true, data });
}
