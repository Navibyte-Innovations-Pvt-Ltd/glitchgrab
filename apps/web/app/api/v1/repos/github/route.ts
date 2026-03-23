export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string };
  private: boolean;
  description: string | null;
}

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

  const response = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated",
    {
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!response.ok) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch repos from GitHub" },
      { status: response.status }
    );
  }

  const ghRepos: GitHubRepo[] = await response.json();

  const repos = ghRepos.map((repo) => ({
    githubId: repo.id,
    fullName: repo.full_name,
    name: repo.name,
    owner: repo.owner.login,
    isPrivate: repo.private,
    description: repo.description,
  }));

  return NextResponse.json({ success: true, data: repos });
}
