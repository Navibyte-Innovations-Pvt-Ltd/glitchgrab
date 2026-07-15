import { prisma } from "@/lib/db";
import { getGitHubIssue } from "@/lib/github";

export interface QaCheckView {
  id: string;
  githubNumber: number;
  githubUrl: string;
  title: string;
  prNumber: number | null;
  prUrl: string | null;
  developerLogin: string | null;
  status: "PENDING" | "PASS" | "FAIL" | "SKIPPED";
  repoFullName: string;
  createdAt: string;
  commentCount: number | null;
}

interface QaView {
  testerName: string;
  testerEmail: string | null;
  testerPhone: string | null;
  orgName: string;
  checks: QaCheckView[];
}

/** Load a tester's QA queue + history, serialized for the client. */
export async function getQaView(testerId: string): Promise<QaView | null> {
  const tester = await prisma.tester.findUnique({
    where: { id: testerId },
    include: {
      org: { select: { name: true } },
      checks: {
        // A QaCheck is created the instant a PR merges, but the fix isn't live
        // until Vercel finishes deploying (~10min). The qa-notify cron stamps
        // notifiedAt once the deploy should be up — that's the same gate that
        // fires the tester's WhatsApp. Hide PENDING checks that haven't reached
        // it yet so the direct link never shows an undeployed fix. Acted-on
        // history (PASS/FAIL/SKIPPED) always stays visible.
        where: { OR: [{ notifiedAt: { not: null } }, { status: { not: "PENDING" } }] },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        include: { repo: { select: { fullName: true, owner: true, name: true, userId: true } } },
      },
    },
  });
  if (!tester) return null;

  // Cache one GitHub token lookup per repo owner (userId) — multiple checks often share a repo.
  const tokenByUserId = new Map<string, string | null>();
  async function tokenFor(userId: string): Promise<string | null> {
    if (!tokenByUserId.has(userId)) {
      const account = await prisma.account.findFirst({
        where: { userId, provider: "github" },
        select: { access_token: true },
      });
      tokenByUserId.set(userId, account?.access_token ?? null);
    }
    return tokenByUserId.get(userId) ?? null;
  }

  const commentCounts = await Promise.all(
    tester.checks.map(async (c) => {
      const ghToken = await tokenFor(c.repo.userId);
      if (!ghToken) return null;
      const issue = await getGitHubIssue(ghToken, c.repo.owner, c.repo.name, c.githubNumber);
      return issue?.comments ?? null;
    })
  );

  return {
    testerName: tester.name,
    testerEmail: tester.email,
    testerPhone: tester.phone,
    orgName: tester.org.name,
    checks: tester.checks.map((c, i) => ({
      id: c.id,
      githubNumber: c.githubNumber,
      githubUrl: c.githubUrl,
      title: c.title,
      prNumber: c.prNumber,
      prUrl: c.prUrl,
      developerLogin: c.developerLogin,
      status: c.status,
      repoFullName: c.repo.fullName,
      createdAt: c.createdAt.toISOString(),
      commentCount: commentCounts[i],
    })),
  };
}
