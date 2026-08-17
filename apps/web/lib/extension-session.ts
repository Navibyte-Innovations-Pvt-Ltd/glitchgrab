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
 *
 * Excludes dot-prefixed meta repos (e.g. `.github`, the org profile
 * README repo) — nobody files application bugs there, and alphabetically
 * `.` sorts before letters, so it was winning the "default selected repo"
 * slot ahead of every real project.
 */
export async function getExtensionSessionRepos(
  identity: ExtensionSessionIdentity
): Promise<{ id: string; fullName: string }[]> {
  if (identity.testerId) {
    const rows = await prisma.testerRepo.findMany({
      where: { testerId: identity.testerId, repo: { name: { not: { startsWith: "." } } } },
      include: { repo: { select: { id: true, fullName: true } } },
      orderBy: [{ repo: { pushedAt: { sort: "desc", nulls: "last" } } }, { createdAt: "desc" }],
    });
    return rows.map((r) => r.repo);
  }
  if (identity.userId) {
    return prisma.repo.findMany({
      where: { userId: identity.userId, name: { not: { startsWith: "." } } },
      select: { id: true, fullName: true },
      // Most recently pushed first — the project someone is about to demo is
      // almost always the one they have been committing to, and this list is
      // read in the seconds before a client call. Nulls last, so a repo the
      // hourly refresh has not seen yet falls back to newest-connected instead
      // of jumping to the top.
      orderBy: [{ pushedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    });
  }
  return [];
}
