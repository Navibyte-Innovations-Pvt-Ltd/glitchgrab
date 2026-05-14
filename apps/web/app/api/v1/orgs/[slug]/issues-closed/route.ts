export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface GithubIssue {
  number: number;
  title: string;
  html_url: string;
  closed_at: string | null;
  pull_request?: unknown;
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const days = Math.min(90, Math.max(7, parseInt(searchParams.get("days") ?? "14", 10)));

  const org = await prisma.organization.findUnique({ where: { githubOrgLogin: slug } });
  if (!org) return NextResponse.json({ success: false, error: "Org not found" }, { status: 404 });

  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ success: false, error: "Not a member" }, { status: 403 });

  const repos = await prisma.repo.findMany({
    where: { orgId: org.id },
    select: { fullName: true },
  });

  const today = new Date();
  today.setUTCHours(23, 59, 59, 999);
  const startDate = new Date(today);
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
  startDate.setUTCHours(0, 0, 0, 0);

  const buckets: { date: string; count: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    buckets.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  const indexByDate = new Map(buckets.map((b, i) => [b.date, i]));

  if (repos.length === 0) {
    return NextResponse.json({
      success: true,
      data: { daily: buckets, total: 0, avgPerDay: 0, bestDay: null },
    });
  }

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "github" },
    select: { access_token: true },
  });

  if (!account?.access_token) {
    return NextResponse.json({
      success: true,
      data: { daily: buckets, total: 0, avgPerDay: 0, bestDay: null },
    });
  }

  const since = startDate.toISOString();

  await Promise.all(
    repos.map(async (repo) => {
      try {
        let page = 1;
        while (page <= 3) {
          const res = await fetch(
            `https://api.github.com/repos/${repo.fullName}/issues?state=closed&sort=updated&direction=desc&per_page=100&page=${page}&since=${since}`,
            {
              headers: {
                Authorization: `Bearer ${account.access_token}`,
                Accept: "application/vnd.github+json",
              },
            }
          );
          if (!res.ok) break;
          const items = (await res.json()) as GithubIssue[];
          if (items.length === 0) break;

          let foundOlder = false;
          for (const item of items) {
            if (item.pull_request || !item.closed_at) continue;
            const closedDate = item.closed_at.slice(0, 10);
            if (closedDate < startDate.toISOString().slice(0, 10)) {
              foundOlder = true;
              continue;
            }
            const idx = indexByDate.get(closedDate);
            if (idx !== undefined) buckets[idx].count++;
          }

          if (foundOlder || items.length < 100) break;
          page++;
        }
      } catch {
        // fail silently per repo
      }
    })
  );

  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  const avgPerDay = Math.round((total / days) * 10) / 10;
  const best = buckets.reduce((max, b) => (b.count > max.count ? b : max), buckets[0]);
  const bestDay = best.count > 0 ? { date: best.date, count: best.count } : null;

  return NextResponse.json({
    success: true,
    data: { daily: buckets, total, avgPerDay, bestDay },
  });
}
