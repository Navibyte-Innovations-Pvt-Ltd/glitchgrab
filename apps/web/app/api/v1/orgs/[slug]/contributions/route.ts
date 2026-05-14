export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface GithubCommit {
  commit: {
    author: { date: string | null } | null;
    committer: { date: string | null } | null;
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  const org = await prisma.organization.findUnique({ where: { githubOrgLogin: slug } });
  if (!org) return NextResponse.json({ success: false, error: "Org not found" }, { status: 404 });

  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ success: false, error: "Not a member" }, { status: 403 });

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "github" },
    select: { access_token: true },
  });

  if (!account?.access_token) {
    return NextResponse.json({ success: true, data: { total: 0, orgSlug: slug, weeks: [] } });
  }

  const repos = await prisma.repo.findMany({
    where: { orgId: org.id },
    select: { fullName: true },
  });

  if (repos.length === 0) {
    return NextResponse.json({ success: true, data: { total: 0, orgSlug: slug, weeks: [] } });
  }

  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);
  const sinceIso = since.toISOString();

  const headers = {
    Authorization: `Bearer ${account.access_token}`,
    Accept: "application/vnd.github+json",
  };

  // date → count
  const dailyCounts = new Map<string, number>();

  await Promise.all(
    repos.map(async (repo) => {
      try {
        // Fetch up to 3 pages (300 commits/year per repo) — enough for most dev shops
        for (let page = 1; page <= 3; page++) {
          const url = `https://api.github.com/repos/${repo.fullName}/commits?since=${sinceIso}&per_page=100&page=${page}`;
          const res = await fetch(url, { headers });
          if (!res.ok) break;

          const commits = (await res.json()) as GithubCommit[];
          if (!Array.isArray(commits) || commits.length === 0) break;

          for (const c of commits) {
            const dateStr =
              c.commit?.author?.date ?? c.commit?.committer?.date ?? null;
            if (!dateStr) continue;
            const iso = dateStr.slice(0, 10);
            dailyCounts.set(iso, (dailyCounts.get(iso) ?? 0) + 1);
          }

          if (commits.length < 100) break; // last page
        }
      } catch {
        // fail silently per repo
      }
    })
  );

  // Build 52-week grid aligned to last Sunday
  const today = new Date();
  const dayOfWeek = today.getUTCDay();
  const lastSunday = new Date(today);
  lastSunday.setUTCDate(today.getUTCDate() - dayOfWeek);
  lastSunday.setUTCHours(0, 0, 0, 0);

  const startSunday = new Date(lastSunday);
  startSunday.setUTCDate(lastSunday.getUTCDate() - 51 * 7);

  const weeks: { date: string; count: number }[][] = [];
  let total = 0;

  for (let w = 0; w < 52; w++) {
    const week: { date: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const ms = startSunday.getTime() + (w * 7 + d) * 86400_000;
      const iso = new Date(ms).toISOString().slice(0, 10);
      const count = dailyCounts.get(iso) ?? 0;
      week.push({ date: iso, count });
      total += count;
    }
    weeks.push(week);
  }

  return NextResponse.json({ success: true, data: { total, orgSlug: slug, weeks } });
}
