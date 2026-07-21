export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getInstallationAccessToken } from "@/lib/github-app";

interface GithubPR {
  number: number;
  title: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  draft: boolean;
  user: { login: string; avatar_url: string } | null;
  head: { ref: string; sha: string };
  base: { ref: string };
  labels: ({ name: string; color: string } | string)[];
  requested_reviewers: { login: string }[];
}

interface CheckRun {
  status: "queued" | "in_progress" | "completed";
  conclusion:
    | "success"
    | "failure"
    | "neutral"
    | "cancelled"
    | "timed_out"
    | "action_required"
    | "skipped"
    | "stale"
    | null;
}

type ChecksState = "passed" | "failed" | "pending" | "none";

async function fetchChecks(
  repoFullName: string,
  sha: string,
  token: string
): Promise<{ state: ChecksState; passed: number; failed: number; total: number }> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repoFullName}/commits/${sha}/check-runs?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    if (!res.ok) return { state: "none", passed: 0, failed: 0, total: 0 };
    const json = (await res.json()) as { check_runs: CheckRun[] };
    const runs = json.check_runs ?? [];
    if (runs.length === 0) return { state: "none", passed: 0, failed: 0, total: 0 };

    let passed = 0;
    let failed = 0;
    let pending = 0;
    for (const r of runs) {
      if (r.status !== "completed") {
        pending++;
        continue;
      }
      if (r.conclusion === "success" || r.conclusion === "neutral" || r.conclusion === "skipped") {
        passed++;
      } else if (
        r.conclusion === "failure" ||
        r.conclusion === "timed_out" ||
        r.conclusion === "action_required" ||
        r.conclusion === "cancelled"
      ) {
        failed++;
      }
    }

    const state: ChecksState =
      pending > 0 ? "pending" : failed > 0 ? "failed" : passed > 0 ? "passed" : "none";

    return { state, passed, failed, total: runs.length };
  } catch {
    return { state: "none", passed: 0, failed: 0, total: 0 };
  }
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

  const installation = await prisma.installation.findFirst({
    where: { accountLogin: org.githubOrgLogin },
  });

  if (!installation) {
    return NextResponse.json({ success: true, data: [] });
  }
  const token = await getInstallationAccessToken(installation.installationId);

  const repos = await prisma.repo.findMany({
    where: { orgId: org.id },
    select: { fullName: true },
  });

  const prs = (
    await Promise.all(
      repos.map(async (repo: { fullName: string }) => {
        try {
          const res = await fetch(
            `https://api.github.com/repos/${repo.fullName}/pulls?state=open&sort=updated&direction=desc&per_page=10`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
              },
            }
          );
          if (!res.ok) return [];
          const items = (await res.json()) as GithubPR[];
          return await Promise.all(
            items.map(async (pr) => ({
              number: pr.number,
              title: pr.title,
              url: pr.html_url,
              createdAt: pr.created_at,
              updatedAt: pr.updated_at,
              draft: pr.draft,
              author: pr.user?.login ?? "unknown",
              authorAvatar: pr.user?.avatar_url ?? null,
              headRef: pr.head.ref,
              baseRef: pr.base.ref,
              labels: pr.labels
                .map((l) => (typeof l === "string" ? { name: l, color: "888888" } : l))
                .slice(0, 3),
              reviewers: pr.requested_reviewers.map((r) => r.login),
              repoFullName: repo.fullName,
              checks: await fetchChecks(repo.fullName, pr.head.sha, token),
            }))
          );
        } catch {
          return [];
        }
      })
    )
  ).flat();

  prs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return NextResponse.json({ success: true, data: prs.slice(0, 20) });
}
