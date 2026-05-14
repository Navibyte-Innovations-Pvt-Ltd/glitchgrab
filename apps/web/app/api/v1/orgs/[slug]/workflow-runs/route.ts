export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listWorkflowRuns, type WorkflowRun } from "@/lib/github";

interface RepoWorkflowRuns {
  repoId: string;
  repoFullName: string;
  runs: WorkflowRun[];
  error: string | null;
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
    select: { id: true, fullName: true, owner: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  const results: RepoWorkflowRuns[] = await Promise.all(
    repos.map(async (repo) => {
      try {
        const runs = await listWorkflowRuns(account.access_token!, repo.owner, repo.name, 20);
        return { repoId: repo.id, repoFullName: repo.fullName, runs, error: null };
      } catch (err) {
        return {
          repoId: repo.id,
          repoFullName: repo.fullName,
          runs: [],
          error: err instanceof Error ? err.message : "Failed to fetch runs",
        };
      }
    })
  );

  return NextResponse.json({ success: true, data: results });
}
