export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface GithubIssue {
  number: number;
  title: string;
  html_url: string;
  created_at: string;
  pull_request?: unknown;
  labels: ({ name: string; color: string } | string)[];
  user: { login: string; avatar_url: string } | null;
  comments: number;
  assignees: { login: string; avatar_url: string }[];
}

interface GithubPR {
  number: number;
  body: string | null;
  state: string;
}

const CLOSING_RE = /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;

async function getLinkedIssueNumbers(repoFullName: string, token: string): Promise<Set<number>> {
  const linked = new Set<number>();
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repoFullName}/pulls?state=open&per_page=50`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
    );
    if (!res.ok) return linked;
    const prs = (await res.json()) as GithubPR[];
    for (const pr of prs) {
      if (!pr.body) continue;
      let match: RegExpExecArray | null;
      CLOSING_RE.lastIndex = 0;
      while ((match = CLOSING_RE.exec(pr.body)) !== null) {
        linked.add(Number(match[1]));
      }
    }
  } catch {
    // ignore
  }
  return linked;
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const assigned = searchParams.get("assigned") === "true";

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
    return NextResponse.json({ success: true, data: [] });
  }

  const token = account.access_token;

  const repos = await prisma.repo.findMany({
    where: { orgId: org.id },
    select: { fullName: true },
  });

  const issues = (
    await Promise.all(
      repos.map(async (repo: { fullName: string }) => {
        try {
          const issueUrl = assigned
            ? `https://api.github.com/repos/${repo.fullName}/issues?state=open&assignee=*&sort=created&direction=desc&per_page=20`
            : `https://api.github.com/repos/${repo.fullName}/issues?state=open&sort=created&direction=desc&per_page=10`;

          const [issuesRes, linkedNumbers] = await Promise.all([
            fetch(issueUrl, {
              headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
            }),
            getLinkedIssueNumbers(repo.fullName, token),
          ]);
          if (!issuesRes.ok) return [];
          const items = (await issuesRes.json()) as GithubIssue[];
          return items
            .filter((i) => !i.pull_request && !linkedNumbers.has(i.number))
            .map((i) => ({
              number: i.number,
              title: i.title,
              url: i.html_url,
              createdAt: i.created_at,
              author: i.user?.login ?? "unknown",
              authorAvatar: i.user?.avatar_url ?? null,
              comments: i.comments,
              labels: i.labels
                .map((l) => (typeof l === "string" ? { name: l, color: "888888" } : l))
                .slice(0, 3),
              repoFullName: repo.fullName,
              assignees: (i.assignees ?? []).map((a) => ({
                login: a.login,
                avatarUrl: a.avatar_url,
              })),
            }));
        } catch {
          return [];
        }
      })
    )
  ).flat();

  issues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ success: true, data: issues.slice(0, 30) });
}
