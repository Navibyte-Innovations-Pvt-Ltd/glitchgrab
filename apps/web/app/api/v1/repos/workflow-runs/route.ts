export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listWorkflowRuns, type WorkflowRun } from "@/lib/github";

export interface RepoWorkflowRuns {
  repoId: string;
  repoFullName: string;
  runs: WorkflowRun[];
  error: string | null;
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
      select: { id: true, fullName: true, owner: true, name: true },
      orderBy: { createdAt: "desc" },
    });

    const results: RepoWorkflowRuns[] = await Promise.all(
      repos.map(async (repo) => {
        try {
          const runs = await listWorkflowRuns(
            accessToken,
            repo.owner,
            repo.name,
            5
          );
          return {
            repoId: repo.id,
            repoFullName: repo.fullName,
            runs,
            error: null,
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to fetch runs";
          return {
            repoId: repo.id,
            repoFullName: repo.fullName,
            runs: [],
            error: message,
          };
        }
      })
    );

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Fetch workflow runs error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
