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

    const repos = await prisma.repo.findMany({
      where: { userId },
      select: { fullName: true },
    });

    const issues = (
      await Promise.all(
        repos.map(async (repo: { fullName: string }) => {
          try {
            const res = await fetch(
              `https://api.github.com/repos/${repo.fullName}/issues?state=open&sort=created&direction=desc&per_page=10`,
              {
                headers: {
                  Authorization: `Bearer ${account.access_token}`,
                  Accept: "application/vnd.github+json",
                },
              }
            );
            if (!res.ok) return [];
            const items = (await res.json()) as GithubIssue[];
            return items
              .filter((i) => !i.pull_request)
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
              }));
          } catch {
            return [];
          }
        })
      )
    ).flat();

    issues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ success: true, data: issues.slice(0, 20) });
  } catch (error) {
    console.error("Fetch issues error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
