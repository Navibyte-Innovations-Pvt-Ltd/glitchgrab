export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listWorkflowRuns, type WorkflowRun } from "@/lib/github";
import { getInstallationAccessToken } from "@/lib/github-app";

interface RepoWorkflowRuns {
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

    const repos = await prisma.repo.findMany({
      where: { userId },
      select: {
        id: true,
        fullName: true,
        owner: true,
        name: true,
        installation: { select: { installationId: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const results: RepoWorkflowRuns[] = await Promise.all(
      repos.map(async (repo) => {
        if (!repo.installation) {
          return {
            repoId: repo.id,
            repoFullName: repo.fullName,
            runs: [],
            error: "GitHub App not installed on this repo",
          };
        }
        try {
          const accessToken = await getInstallationAccessToken(repo.installation.installationId);
          // Fetch more runs than we need so the client has enough completed
          // samples to estimate median duration for in-progress workflows.
          const runs = await listWorkflowRuns(
            accessToken,
            repo.owner,
            repo.name,
            20
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
