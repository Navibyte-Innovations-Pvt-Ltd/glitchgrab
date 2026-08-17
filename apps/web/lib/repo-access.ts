import { prisma } from "@/lib/db";

/**
 * Repo-level access control for project context (#311 Phase A).
 *
 * Project context holds client-call material — decisions, complaints, things we
 * promised. That is more sensitive than a bug report, so **org membership alone
 * grants nothing**. Access is either:
 *
 *   1. you own the repo (`Repo.userId`), or
 *   2. someone granted you an explicit `RepoMember` row.
 *
 * The owner is implicit on purpose — no seeding, no backfill for existing
 * repos, and nothing to drift if a repo changes hands. `TesterRepo` is the
 * shape precedent for the grant table.
 *
 * Every context read/write funnels through here so a route and a server
 * component can never disagree about who may see what. Routes must never trust
 * a client-supplied `repoId` — pass it through {@link assertRepoAccess} first.
 */

export interface AccessibleRepo {
  id: string;
  fullName: string;
  owner: string;
  name: string;
  /** True when the caller owns the repo (vs. holding a granted RepoMember row). */
  isOwner: boolean;
}

/**
 * Every repo this user may read context for, owned repos first, then grants.
 * Returns `[]` for a user with no repos — callers should short-circuit rather
 * than querying with an empty `in` list.
 */
export async function getAccessibleRepos(userId: string): Promise<AccessibleRepo[]> {
  const [owned, granted] = await Promise.all([
    prisma.repo.findMany({
      where: { userId },
      select: { id: true, fullName: true, owner: true, name: true },
      // Most recently pushed first: the project someone is about to demo is
      // almost always the one they have been committing to. `pushedAt` is null
      // until the hourly refresh has seen the repo, and nulls sort last so a
      // never-refreshed repo falls back to newest-connected rather than
      // jumping to the top of the picker.
      orderBy: [{ pushedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    }),
    prisma.repoMember.findMany({
      where: { userId },
      select: {
        repo: { select: { id: true, fullName: true, owner: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const seen = new Set(owned.map((r) => r.id));
  const result: AccessibleRepo[] = owned.map((r) => ({ ...r, isOwner: true }));

  // A grant on a repo you already own is redundant, not an error — dedupe
  // rather than showing the same project twice in the picker.
  for (const { repo } of granted) {
    if (seen.has(repo.id)) continue;
    seen.add(repo.id);
    result.push({ ...repo, isOwner: false });
  }

  return result;
}

/**
 * Resolve a client-supplied `repoId` to a repo the caller may actually touch.
 * Returns null when the id is missing, unknown, or out of scope — callers
 * answer 403 without leaking whether the repo exists.
 */
export async function assertRepoAccess(
  userId: string,
  repoId: string | null | undefined
): Promise<AccessibleRepo | null> {
  if (!repoId) return null;

  const repo = await prisma.repo.findUnique({
    where: { id: repoId },
    select: { id: true, fullName: true, owner: true, name: true, userId: true },
  });
  if (!repo) return null;

  if (repo.userId === userId) {
    return { id: repo.id, fullName: repo.fullName, owner: repo.owner, name: repo.name, isOwner: true };
  }

  const grant = await prisma.repoMember.findUnique({
    where: { repoId_userId: { repoId: repo.id, userId } },
    select: { id: true },
  });
  if (!grant) return null;

  return { id: repo.id, fullName: repo.fullName, owner: repo.owner, name: repo.name, isOwner: false };
}

/**
 * Grant context access. Only the repo **owner** may grant — a granted member
 * cannot widen the circle further. Idempotent: re-granting is a no-op, not an
 * error, so the UI can fire it without checking first.
 */
export async function grantRepoAccess(params: {
  ownerId: string;
  repoId: string;
  userId: string;
}): Promise<boolean> {
  const owned = await prisma.repo.findFirst({
    where: { id: params.repoId, userId: params.ownerId },
    select: { id: true },
  });
  if (!owned) return false;

  // Granting the owner a row is harmless but pointless — ownership is implicit.
  if (params.userId === params.ownerId) return true;

  await prisma.repoMember.upsert({
    where: { repoId_userId: { repoId: params.repoId, userId: params.userId } },
    create: { repoId: params.repoId, userId: params.userId, grantedBy: params.ownerId },
    update: {},
  });
  return true;
}

/** Revoke context access. Owner-only, mirrors {@link grantRepoAccess}. */
export async function revokeRepoAccess(params: {
  ownerId: string;
  repoId: string;
  userId: string;
}): Promise<boolean> {
  const owned = await prisma.repo.findFirst({
    where: { id: params.repoId, userId: params.ownerId },
    select: { id: true },
  });
  if (!owned) return false;

  await prisma.repoMember.deleteMany({
    where: { repoId: params.repoId, userId: params.userId },
  });
  return true;
}
