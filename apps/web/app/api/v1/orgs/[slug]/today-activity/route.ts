export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface GithubSearchCommit {
  sha: string;
  repository: { full_name: string };
}

interface GithubSearchResponse {
  total_count: number;
  items: GithubSearchCommit[];
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

  // Count today's commits per login across all org repos — search API covers ALL branches
  const counts: Record<string, { commits: number; repos: string[]; shas: Set<string> }> = {};
  const repoFilter = repos.map((r) => `repo:${r.fullName}`).join("+");

  await Promise.all(
    logins.map(async (login) => {
      try {
        const q = `author:${login}+author-date:>=${sinceIso}+${repoFilter}`;
        const url = `https://api.github.com/search/commits?q=${q}&per_page=100`;
        const res = await fetch(url, { headers });
        if (!res.ok) return;
        const json = (await res.json()) as GithubSearchResponse;
        if (!Array.isArray(json.items) || json.items.length === 0) return;

        counts[login] ??= { commits: 0, repos: [], shas: new Set() };
        for (const item of json.items) {
          if (counts[login].shas.has(item.sha)) continue;
          counts[login].shas.add(item.sha);
          counts[login].commits += 1;
          const repoShort = item.repository.full_name.split("/")[1] ?? item.repository.full_name;
          if (!counts[login].repos.includes(repoShort)) {
            counts[login].repos.push(repoShort);
          }
        }
      } catch {
        // fail silently
      }
    })
  );

  // Remove members with 0 commits, strip internal sha set
  const data = Object.fromEntries(
    Object.entries(counts)
      .filter(([, v]) => v.commits > 0)
      .map(([k, v]) => [k, { commits: v.commits, repos: v.repos }])
  );

  return NextResponse.json({ success: true, data });
}
