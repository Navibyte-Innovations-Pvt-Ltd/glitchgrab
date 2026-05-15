export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface GithubPR {
  number: number;
  title: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  draft: boolean;
  user: { login: string; avatar_url: string } | null;
  head: { ref: string };
  base: { ref: string };
  labels: ({ name: string; color: string } | string)[];
  requested_reviewers: { login: string }[];
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
    return NextResponse.json({ success: true, data: [] });
  }

  const repos = await prisma.repo.findMany({
    where: { orgId: org.id },
    select: { fullName: true },
  });

  const prs = (
    await Promise.all(
      repos.map(async (repo) => {
        try {
          const res = await fetch(
            `https://api.github.com/repos/${repo.fullName}/pulls?state=open&sort=updated&direction=desc&per_page=10`,
            {
              headers: {
                Authorization: `Bearer ${account.access_token}`,
                Accept: "application/vnd.github+json",
              },
            }
          );
          if (!res.ok) return [];
          const items = (await res.json()) as GithubPR[];
          return items.map((pr) => ({
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
          }));
        } catch {
          return [];
        }
      })
    )
  ).flat();

  prs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return NextResponse.json({ success: true, data: prs.slice(0, 20) });
}
