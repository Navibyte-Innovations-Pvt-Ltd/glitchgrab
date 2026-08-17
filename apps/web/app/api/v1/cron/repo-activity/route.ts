export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Refresh `Repo.pushedAt` from GitHub.
 *
 * The in-Meet project picker orders by last commit, because the project you
 * are about to demo is almost always the one you have been pushing to. Asking
 * GitHub for that at pick time is the wrong trade twice over: the list is built
 * while someone is seconds from a client call, and per-repo lookups would burn
 * the rate limit on rendering a menu.
 *
 * Uses each user's OAuth token, the same credential `/api/v1/repos/github`
 * lists repos with — the GitHub App installation flow is not live yet, so a
 * cron keyed on `Installation` rows would quietly refresh nothing at all. When
 * the App migration lands this should prefer installation tokens: one call per
 * installation instead of one per user, and no dependency on a user's OAuth
 * grant still being valid.
 */
const PER_PAGE = 100;
const MAX_PAGES = 10;

interface GithubRepo {
  id: number;
  pushed_at: string | null;
}

async function fetchUserRepos(token: string): Promise<GithubRepo[]> {
  const all: GithubRepo[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(
      `https://api.github.com/user/repos?per_page=${PER_PAGE}&page=${page}` +
        `&sort=pushed&affiliation=owner,collaborator,organization_member`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) throw new Error(`GitHub said ${res.status}`);

    const batch = (await res.json()) as GithubRepo[];
    all.push(...batch);

    if (batch.length < PER_PAGE) break;
  }

  return all;
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
  // Only users who actually have connected repos — there is nothing to order
  // for anyone else, and each user costs at least one GitHub request.
  const users = await prisma.user.findMany({
    where: { repos: { some: {} } },
    select: {
      id: true,
      accounts: {
        where: { provider: "github" },
        select: { access_token: true },
        take: 1,
      },
      repos: { select: { id: true, githubId: true, pushedAt: true } },
    },
  });

  const results: Array<{ userId: string; status: string; updated?: number }> = [];

  for (const user of users) {
    const token = user.accounts[0]?.access_token;
    if (!token) {
      results.push({ userId: user.id, status: "skipped: no github token" });
      continue;
    }

    try {
      const remote = await fetchUserRepos(token);

      // Match on githubId, not fullName: a renamed or transferred repo keeps
      // its id, and matching on the name would silently stop updating it.
      const pushedById = new Map(remote.map((r) => [r.id, r.pushed_at]));
      let updated = 0;

      for (const repo of user.repos) {
        const pushed = pushedById.get(repo.githubId);
        if (!pushed) continue;

        const next = new Date(pushed);
        if (repo.pushedAt && repo.pushedAt.getTime() === next.getTime()) continue;

        await prisma.repo.update({ where: { id: repo.id }, data: { pushedAt: next } });
        updated++;
      }

      results.push({ userId: user.id, status: "ok", updated });
    } catch (error) {
      // One user with a revoked token must not stop the rest.
      results.push({
        userId: user.id,
        status: `failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

    return NextResponse.json({ success: true, data: { users: results } });
  } catch (error) {
    // A bare 500 with an empty body says nothing about whether GitHub, the
    // database or the schema is the problem — and this only ever runs
    // unattended, so the response IS the diagnosis.
    console.error("repo-activity cron error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
