import { prisma } from "@/lib/db";

/**
 * Turn rows already in the DB into distillable material (#311 Phase A).
 *
 * Phase A runs on data that exists today: `Report` and `QaCheck`. Note what is
 * NOT here — `CaptureSession` has no `repoId`, no auth, and a 24h `expiresAt`,
 * so it cannot be attributed to a project and cannot be a source. The `CAPTURE`
 * enum value exists for when Phase B gives capture sessions a repo, not before.
 *
 * "Already distilled" is a **stamp on the source row** (`contextDistilledAt`),
 * not something inferred from the context items that came out of it. That
 * matters: a source can legitimately produce zero items ("doesn't work" is not
 * project memory), and inferring from output would re-send those to the model
 * on every press, forever, while never draining the queue.
 */

export type DistillableSourceType = "REPORT" | "QA" | "MANUAL";

export interface DistillableSource {
  sourceType: DistillableSourceType;
  /** Row id this came from. Null for MANUAL — there is no row to point back at. */
  sourceId: string | null;
  /** Shown to the model as "Source:" and used in the dashboard's source badge. */
  label: string;
  /** When the thing happened, not when we distilled it. */
  occurredAt: Date;
  text: string;
}

/**
 * Below this there is nothing to distill — a report whose whole body is
 * "doesn't work" costs a model call and yields nothing.
 */
const MIN_TEXT_LENGTH = 40;

/**
 * Cap per distill run. Sources are distilled sequentially (see distill.ts), so
 * this is also the wall-clock budget: 10 × ~10s stays inside a serverless
 * function's lifetime where 25 would not. A larger backlog is drained by
 * pressing again — the button shows how many are left.
 */
export const MAX_SOURCES_PER_RUN = 10;

function reportToText(r: {
  rawInput: string | null;
  pageUrl: string | null;
  reporterName: string;
  source: string;
}): string {
  const parts = [
    `Reported by: ${r.reporterName} (${r.source})`,
    r.pageUrl ? `Page: ${r.pageUrl}` : null,
    r.rawInput?.trim() || null,
  ].filter(Boolean);
  return parts.join("\n");
}

function qaCheckToText(c: {
  title: string;
  status: string;
  failReason: string | null;
  githubNumber: number;
}): string {
  const parts = [
    `QA check on issue #${c.githubNumber}: ${c.title}`,
    `Result: ${c.status}`,
    c.failReason?.trim() ? `Tester said: ${c.failReason.trim()}` : null,
  ].filter(Boolean);
  return parts.join("\n");
}

/** Stamp a source row as processed. No-op for MANUAL, which has no row. */
export async function markSourceDistilled(source: DistillableSource): Promise<void> {
  if (!source.sourceId) return;
  const now = new Date();

  if (source.sourceType === "REPORT") {
    await prisma.report.update({
      where: { id: source.sourceId },
      data: { contextDistilledAt: now },
    });
    return;
  }
  if (source.sourceType === "QA") {
    await prisma.qaCheck.update({
      where: { id: source.sourceId },
      data: { contextDistilledAt: now },
    });
  }
}

/**
 * Take the next batch of undistilled sources for a repo, newest first.
 *
 * This **writes**: anything too short to be worth a model call is stamped
 * processed on the spot and left out of the returned batch. Without that,
 * short rows would sit permanently at the head of the queue and every press
 * would hand back the same unusable batch.
 */
export async function claimSources(
  repoId: string,
  limit = MAX_SOURCES_PER_RUN
): Promise<DistillableSource[]> {
  const [reports, qaChecks] = await Promise.all([
    prisma.report.findMany({
      where: { repoId, contextDistilledAt: null, rawInput: { not: null } },
      select: {
        id: true,
        rawInput: true,
        pageUrl: true,
        reporterName: true,
        source: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.qaCheck.findMany({
      where: { repoId, contextDistilledAt: null, status: { in: ["PASS", "FAIL"] } },
      select: {
        id: true,
        title: true,
        status: true,
        failReason: true,
        githubNumber: true,
        verifiedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  const sources: DistillableSource[] = [];
  const skippedReports: string[] = [];
  const skippedQa: string[] = [];

  for (const r of reports) {
    const text = reportToText(r);
    if (text.length < MIN_TEXT_LENGTH) {
      skippedReports.push(r.id);
      continue;
    }
    sources.push({
      sourceType: "REPORT",
      sourceId: r.id,
      label: "Bug report",
      occurredAt: r.createdAt,
      text,
    });
  }

  for (const c of qaChecks) {
    const text = qaCheckToText(c);
    if (text.length < MIN_TEXT_LENGTH) {
      skippedQa.push(c.id);
      continue;
    }
    sources.push({
      sourceType: "QA",
      sourceId: c.id,
      label: "QA check",
      occurredAt: c.verifiedAt ?? c.createdAt,
      text,
    });
  }

  const now = new Date();
  await Promise.all([
    skippedReports.length
      ? prisma.report.updateMany({
          where: { id: { in: skippedReports } },
          data: { contextDistilledAt: now },
        })
      : null,
    skippedQa.length
      ? prisma.qaCheck.updateMany({
          where: { id: { in: skippedQa } },
          data: { contextDistilledAt: now },
        })
      : null,
  ]);

  // Newest first so a capped run distills what is still relevant, not the
  // oldest backlog nobody remembers.
  sources.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  return sources.slice(0, limit);
}

/**
 * Exact pending counts for many repos in two grouped queries — no per-repo
 * round trip, no shared row budget that would let one noisy repo starve the
 * others out of their counts.
 *
 * Slightly optimistic: a `groupBy` can't apply `MIN_TEXT_LENGTH`, so rows that
 * are too short to distill are still counted here. They self-correct on the
 * next press, when `claimSources` stamps them.
 */
export async function countUndistilledSourcesByRepo(
  repoIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (repoIds.length === 0) return counts;
  for (const id of repoIds) counts.set(id, 0);

  const [reports, qaChecks] = await Promise.all([
    prisma.report.groupBy({
      by: ["repoId"],
      where: { repoId: { in: repoIds }, contextDistilledAt: null, rawInput: { not: null } },
      _count: { _all: true },
    }),
    prisma.qaCheck.groupBy({
      by: ["repoId"],
      where: {
        repoId: { in: repoIds },
        contextDistilledAt: null,
        status: { in: ["PASS", "FAIL"] },
      },
      _count: { _all: true },
    }),
  ]);

  for (const r of reports) {
    counts.set(r.repoId, (counts.get(r.repoId) ?? 0) + r._count._all);
  }
  for (const c of qaChecks) {
    counts.set(c.repoId, (counts.get(c.repoId) ?? 0) + c._count._all);
  }

  return counts;
}
