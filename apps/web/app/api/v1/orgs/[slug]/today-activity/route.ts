export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface GithubCommit {
  commit: { author: { date: string | null } | null };
}

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

  // Use requester's own token — has full access to private org repos they belong to
  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "github" },
    select: { access_token: true },
  });
  if (!account?.access_token) {
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
    .map((m) => m.user.githubLogin)
    .filter((l): l is string => !!l);

  if (logins.length === 0 || repos.length === 0) {
    return NextResponse.json({ success: true, data: {} });
  }

  // since = start of today UTC
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const headers = {
    Authorization: `Bearer ${account.access_token}`,
    Accept: "application/vnd.github+json",
  };

  // Count today's commits per login across all org repos
  const counts: Record<string, { commits: number; repos: string[] }> = {};

  await Promise.all(
    logins.flatMap((login) =>
      repos.map(async (repo) => {
        try {
          const url = `https://api.github.com/repos/${repo.fullName}/commits?author=${login}&since=${sinceIso}&per_page=100`;
          const res = await fetch(url, { headers });
          if (!res.ok) return;
          const commits = (await res.json()) as GithubCommit[];
          if (!Array.isArray(commits) || commits.length === 0) return;

          const repoShort = repo.fullName.split("/")[1] ?? repo.fullName;
          counts[login] ??= { commits: 0, repos: [] };
          counts[login].commits += commits.length;
          if (!counts[login].repos.includes(repoShort)) {
            counts[login].repos.push(repoShort);
          }
        } catch {
          // fail silently
        }
      })
    )
  );

  // Remove members with 0 commits
  const data = Object.fromEntries(
    Object.entries(counts).filter(([, v]) => v.commits > 0)
  );

  return NextResponse.json({ success: true, data });
}
