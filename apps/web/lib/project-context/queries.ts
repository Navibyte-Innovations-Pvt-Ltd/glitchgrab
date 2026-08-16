import { prisma } from "@/lib/db";
import { getAccessibleRepos, type AccessibleRepo } from "@/lib/repo-access";
import { countUndistilledSourcesByRepo } from "./sources";

/**
 * Read side of project context (#311 Phase A).
 *
 * Every function here takes a `userId` and resolves scope through
 * `lib/repo-access` — there is no way to read context without going past the
 * gate, so a route and a server component can't drift apart on who sees what.
 */

export interface ContextItemView {
  id: string;
  repoId: string;
  repoFullName: string;
  kind: "DECISION" | "REQUEST" | "COMPLAINT" | "COMMITMENT" | "FACT";
  text: string;
  sourceType: "MEETING" | "REPORT" | "CAPTURE" | "QA" | "MANUAL";
  sourceId: string | null;
  occurredAt: string;
  confidence: number;
  createdAt: string;
}

export interface ContextRepoView extends AccessibleRepo {
  itemCount: number;
  /** Sources on this repo not yet distilled — drives the backfill button label. */
  pendingSources: number;
}

/** Hard ceiling on one timeline read. Older items stay queryable by repo filter. */
const MAX_ITEMS = 300;

/**
 * The timeline. `repoId` scopes to one project; omitted, it spans every repo
 * the user may read. A repoId outside that scope returns `[]` — it is never an
 * error that confirms the repo exists.
 */
export async function getContextTimeline(params: {
  userId: string;
  repoId?: string | null;
  limit?: number;
}): Promise<ContextItemView[]> {
  const repos = await getAccessibleRepos(params.userId);
  if (repos.length === 0) return [];

  const allowed = repos.map((r) => r.id);
  const repoIds = params.repoId ? allowed.filter((id) => id === params.repoId) : allowed;
  if (repoIds.length === 0) return [];

  const names = new Map(repos.map((r) => [r.id, r.fullName]));

  const items = await prisma.projectContextItem.findMany({
    where: { repoId: { in: repoIds } },
    select: {
      id: true,
      repoId: true,
      kind: true,
      text: true,
      sourceType: true,
      sourceId: true,
      occurredAt: true,
      confidence: true,
      createdAt: true,
    },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: Math.min(params.limit ?? MAX_ITEMS, MAX_ITEMS),
  });

  return items.map((i) => ({
    ...i,
    repoFullName: names.get(i.repoId) ?? "",
    occurredAt: i.occurredAt.toISOString(),
    createdAt: i.createdAt.toISOString(),
  }));
}

/**
 * Repos the user may store context against, with the two counts the UI needs.
 * Also the picker's data source — a repo absent here can't be written to.
 */
export async function getContextRepos(userId: string): Promise<ContextRepoView[]> {
  const repos = await getAccessibleRepos(userId);
  if (repos.length === 0) return [];

  const counts = await prisma.projectContextItem.groupBy({
    by: ["repoId"],
    where: { repoId: { in: repos.map((r) => r.id) } },
    _count: { _all: true },
  });
  const countByRepo = new Map(counts.map((c) => [c.repoId, c._count._all]));

  // Batched on purpose — one query set for every repo, not one per repo. The
  // number is what makes the backfill button honest ("Distill 34 sources").
  const pending = await countUndistilledSourcesByRepo(repos.map((r) => r.id));

  return repos.map((r) => ({
    ...r,
    itemCount: countByRepo.get(r.id) ?? 0,
    pendingSources: pending.get(r.id) ?? 0,
  }));
}

/**
 * Delete one item, scoped to what the caller may touch. Returns false when the
 * item is missing or out of scope — the route answers the same either way.
 */
export async function deleteContextItem(userId: string, itemId: string): Promise<boolean> {
  const item = await prisma.projectContextItem.findUnique({
    where: { id: itemId },
    select: { id: true, repoId: true },
  });
  if (!item) return false;

  const repos = await getAccessibleRepos(userId);
  if (!repos.some((r) => r.id === item.repoId)) return false;

  await prisma.projectContextItem.delete({ where: { id: item.id } });
  return true;
}
