export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface GithubPull {
  number: number;
  title: string;
  html_url: string;
  draft: boolean;
  created_at: string;
  user: { login: string; avatar_url: string } | null;
  head: { sha: string };
}

interface GithubCheckRun {
  status: "queued" | "in_progress" | "completed" | string;
  conclusion: string | null;
}

type ChecksRollup = "passing" | "failing" | "pending" | "none";

async function fetchChecksRollup(
  repoFullName: string,
  sha: string,
  accessToken: string,
): Promise<{ rollup: ChecksRollup; total: number; failed: number }> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repoFullName}/commits/${sha}/check-runs?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      },
    );
    if (!res.ok) return { rollup: "none", total: 0, failed: 0 };
    const data = (await res.json()) as { check_runs?: GithubCheckRun[] };
    const runs = data.check_runs ?? [];
    if (runs.length === 0) return { rollup: "none", total: 0, failed: 0 };

    let failed = 0;
    let pending = 0;
    for (const r of runs) {
      if (r.status !== "completed") {
        pending += 1;
        continue;
      }
      if (
        r.conclusion === "failure" ||
        r.conclusion === "timed_out" ||
        r.conclusion === "action_required" ||
        r.conclusion === "startup_failure"
      ) {
        failed += 1;
      }
    }

    const rollup: ChecksRollup =
      failed > 0 ? "failing" : pending > 0 ? "pending" : "passing";
    return { rollup, total: runs.length, failed };
  } catch {
    return { rollup: "none", total: 0, failed: 0 };
  }
}

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const account = await prisma.account.findFirst({
      where: { userId, provider: "github" },
      select: { access_token: true },
    });

    if (!account?.access_token) {
      return NextResponse.json({ success: true, data: [] });
    }

    const accessToken = account.access_token;

    const repos = await prisma.repo.findMany({
      where: { userId },
      select: { fullName: true },
    });

    const pulls = (
      await Promise.all(
        repos.map(async (repo) => {
          try {
            const res = await fetch(
              `https://api.github.com/repos/${repo.fullName}/pulls?state=open&sort=updated&direction=desc&per_page=10`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  Accept: "application/vnd.github+json",
                },
              }
            );
            if (!res.ok) return [];
            const prs = (await res.json()) as GithubPull[];
            const checks = await Promise.all(
              prs.map((pr) =>
                fetchChecksRollup(repo.fullName, pr.head.sha, accessToken),
              ),
            );
            return prs.map((pr, i) => ({
              number: pr.number,
              title: pr.title,
              url: pr.html_url,
              draft: pr.draft,
              createdAt: pr.created_at,
              author: pr.user?.login ?? "unknown",
              authorAvatar: pr.user?.avatar_url ?? null,
              repoFullName: repo.fullName,
              checks: checks[i].rollup,
              checksTotal: checks[i].total,
              checksFailed: checks[i].failed,
            }));
          } catch {
            return [];
          }
        })
      )
    ).flat();

    pulls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ success: true, data: pulls.slice(0, 20) });
  } catch (error) {
    console.error("Fetch PRs error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
