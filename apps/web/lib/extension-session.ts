import { prisma } from "@/lib/db";

interface ExtensionSessionIdentity {
  testerId: string | null;
  userId: string | null;
  testerName: string;
  testerEmail: string | null;
}

/** Resolves a live (not-ended) ExtensionSession's identity, or null. */
export async function getExtensionSessionIdentity(
  sessionId: string
): Promise<ExtensionSessionIdentity | null> {
  const session = await prisma.extensionSession.findUnique({
    where: { id: sessionId },
    select: { testerId: true, userId: true, testerName: true, testerEmail: true, endedAt: true },
  });
  if (!session || session.endedAt) return null;
  return session;
}

/**
 * Repos an ExtensionSession is allowed to see/report against — a QA tester
 * gets ONLY their assigned repos (TesterRepo), a dashboard owner gets every
 * repo they own. Server-authoritative: never trust a client-supplied repoId
 * without checking it's in this list (#297 — this was an IDOR before).
 */
export async function getExtensionSessionRepos(
  identity: ExtensionSessionIdentity
): Promise<{ id: string; fullName: string }[]> {
  if (identity.testerId) {
    const rows = await prisma.testerRepo.findMany({
      where: { testerId: identity.testerId },
      include: { repo: { select: { id: true, fullName: true } } },
    });
    return rows.map((r) => r.repo);
  }
  if (identity.userId) {
    return prisma.repo.findMany({
      where: { userId: identity.userId },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    });
  }
  return [];
}
