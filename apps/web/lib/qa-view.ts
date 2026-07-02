import { prisma } from "@/lib/db";

export interface QaCheckView {
  id: string;
  githubNumber: number;
  githubUrl: string;
  title: string;
  prNumber: number | null;
  prUrl: string | null;
  developerLogin: string | null;
  status: "PENDING" | "PASS" | "FAIL";
  repoFullName: string;
  createdAt: string;
}

interface QaView {
  testerName: string;
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
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        include: { repo: { select: { fullName: true } } },
      },
    },
  });
  if (!tester) return null;

  return {
    testerName: tester.name,
    orgName: tester.org.name,
    checks: tester.checks.map((c) => ({
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
    })),
  };
}
