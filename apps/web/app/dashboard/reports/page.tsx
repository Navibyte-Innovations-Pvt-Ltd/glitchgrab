export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCollabSession } from "@/lib/collab-auth";
import { hashToken } from "@/lib/tokens";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { ReportsTabs } from "./reports-tabs";

export default async function ReportsPage() {
  const session = await auth();
  const collabSession = await getCollabSession();
  const userId = session?.user?.id;

  // Get repos the user owns or has access to
  const repoIds: string[] = [];

  if (userId) {
    const repos = await prisma.repo.findMany({
      where: { userId },
      select: { id: true },
    });
    repoIds.push(...repos.map((r) => r.id));
  }

  if (collabSession) {
    const collabRepos = await prisma.collaboratorRepo.findMany({
      where: {
        collaborator: { id: collabSession.collaboratorId, status: "ACCEPTED" },
      },
      select: { repoId: true },
    });
    repoIds.push(...collabRepos.map((r) => r.repoId));
  }

  if (repoIds.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Bug reports and issues created</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Connect a repo and start reporting bugs to see them here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Find which repo the platform token points to (bugs reported about Glitchgrab)
  const platformToken = process.env.NEXT_PUBLIC_GLITCHGRAB_TOKEN;
  let platformRepoId: string | null = null;
  if (platformToken) {
    const tokenHash = hashToken(platformToken);
    const token = await prisma.apiToken.findUnique({
      where: { tokenHash },
      select: { repoId: true },
    });
    platformRepoId = token?.repoId ?? null;
  }

  const reports = await prisma.report.findMany({
    where: { repoId: { in: repoIds } },
    include: {
      repo: { select: { id: true, fullName: true } },
      issue: { select: { githubNumber: true, githubUrl: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Fetch GitHub issue states for reports that have issues
  const issueStates: Record<string, string> = {};
  if (userId) {
    const account = await prisma.account.findFirst({
      where: { userId, provider: "github" },
      select: { access_token: true },
    });
    if (account?.access_token) {
      // Group issues by repo for batch fetching
      const issuesByRepo = new Map<string, number[]>();
      for (const r of reports) {
        if (r.issue) {
          const key = r.repo.fullName;
          const existing = issuesByRepo.get(key) ?? [];
          existing.push(r.issue.githubNumber);
          issuesByRepo.set(key, existing);
        }
      }
      // Fetch states per repo
      await Promise.all(
        Array.from(issuesByRepo.entries()).map(async ([fullName, numbers]) => {
          try {
            const res = await fetch(
              `https://api.github.com/repos/${fullName}/issues?state=all&per_page=100`,
              { headers: { Authorization: `Bearer ${account.access_token}` }, next: { revalidate: 60 } }
            );
            if (res.ok) {
              const issues = (await res.json()) as { number: number; state: string }[];
              for (const issue of issues) {
                if (numbers.includes(issue.number)) {
                  issueStates[`${fullName}#${issue.number}`] = issue.state;
                }
              }
            }
          } catch {
            // skip — we'll show DB status as fallback
          }
        })
      );
    }
  }

  // Split into two lists
  const myReports = platformRepoId
    ? reports.filter((r) => r.repoId === platformRepoId)
    : [];
  const productIssues = platformRepoId
    ? reports.filter((r) => r.repoId !== platformRepoId)
    : reports;

  function serializeReport(r: (typeof reports)[number]) {
    const ghState = r.issue
      ? issueStates[`${r.repo.fullName}#${r.issue.githubNumber}`] ?? null
      : null;
    return {
      id: r.id,
      source: r.source,
      status: r.status,
      rawInput: r.rawInput,
      failReason: r.failReason,
      createdAt: r.createdAt.toISOString(),
      repoFullName: r.repo.fullName,
      issue: r.issue
        ? {
            githubNumber: r.issue.githubNumber,
            githubUrl: r.issue.githubUrl,
            title: r.issue.title,
            githubState: ghState,
          }
        : null,
    };
  }

  const serialized = {
    myReports: myReports.map(serializeReport),
    productIssues: productIssues.map(serializeReport),
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Bug reports and issues created
        </p>
      </div>
      <ReportsTabs
        myReports={serialized.myReports}
        productIssues={serialized.productIssues}
      />
    </div>
  );
}
