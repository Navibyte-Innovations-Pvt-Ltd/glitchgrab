export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string; type: "User" | "Organization" };
  private: boolean;
  description: string | null;
}

const PER_PAGE = 100;
const MAX_PAGES = 10;

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const account = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      provider: "github",
    },
    select: { access_token: true },
  });

  if (!account?.access_token) {
    return NextResponse.json(
      { success: false, error: "GitHub account not linked" },
      { status: 400 }
    );
  }

  const headers = {
    Authorization: `Bearer ${account.access_token}`,
    Accept: "application/vnd.github+json",
  };

  const allGhRepos: GitHubRepo[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await fetch(
      `https://api.github.com/user/repos?per_page=${PER_PAGE}&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
      { headers, cache: "no-store" }
    );

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch repos from GitHub" },
        { status: response.status }
      );
    }

    const batch: GitHubRepo[] = await response.json();
    allGhRepos.push(...batch);
    if (batch.length < PER_PAGE) break;
  }

  const repos = allGhRepos.map((repo) => ({
    githubId: repo.id,
    fullName: repo.full_name,
    name: repo.name,
    owner: repo.owner.login,
    ownerType: repo.owner.type === "Organization" ? "org" : "user",
    isPrivate: repo.private,
    description: repo.description,
  }));

  const accountsMap = new Map<string, "user" | "org">();
  for (const repo of repos) {
    if (!accountsMap.has(repo.owner)) {
      accountsMap.set(repo.owner, repo.ownerType as "user" | "org");
    }
  }
  const accounts = Array.from(accountsMap, ([login, type]) => ({ login, type }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "user" ? -1 : 1;
      return a.login.localeCompare(b.login);
    });

  const clientId = process.env.GITHUB_CLIENT_ID;
  const connectionUrl = clientId
    ? `https://github.com/settings/connections/applications/${clientId}`
    : "https://github.com/settings/applications";

  return NextResponse.json({
    success: true,
    data: { repos, accounts, connectionUrl },
  });
}
