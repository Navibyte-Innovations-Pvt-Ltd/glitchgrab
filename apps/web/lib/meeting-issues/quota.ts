import { prisma } from "@/lib/db";

/**
 * Cost guard for the meeting issue assistant.
 *
 * Same shape as the report assistant's guard (`lib/ai-assist/quota.ts`): a hard
 * cap with a module-private constant, enforced here and nowhere else. This
 * surface is chattier than that one — a vision call over a full transcript, plus
 * a correction round-trip per draft per argument — so the cap counts the
 * expensive thing (an extraction over a whole call) rather than messages.
 *
 * Re-extracting the SAME call does not cost a slot beyond the first: someone
 * who deleted every draft and wants to start over is not the abuse case, and
 * charging them for it just teaches them not to re-run it when they should.
 *
 * The slot is CLAIMED here — the stamp is written before the model is called,
 * not after it succeeds. A cap that only counts successful extractions bounds
 * nothing: a model that fails after burning a full vision call over an hour of
 * transcript costs exactly as much as one that worked, and a retry loop would
 * spend the month's budget without the counter ever moving.
 */

/** Calls that may be read per repo per calendar month. */
const MONTHLY_EXTRACTION_CAP = 40;

function startOfMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

interface ExtractionQuota {
  ok: boolean;
  /** Extractions left this month, after this one. */
  remaining: number;
}

export async function claimExtraction(params: {
  repoId: string | null;
  meetingId: string;
}): Promise<ExtractionQuota> {
  // An unfiled call has no repo to charge, and is visible only to the person
  // who recorded it. Let it through — it is one call, and gating it would block
  // exactly the prospect conversation this feature is most useful on.
  if (!params.repoId) return { ok: true, remaining: MONTHLY_EXTRACTION_CAP };

  const since = startOfMonth(new Date());

  const used = await prisma.meeting.count({
    where: {
      repoId: params.repoId,
      issuesExtractedAt: { gte: since },
      // Already counted this month — a re-run is free.
      id: { not: params.meetingId },
    },
  });

  if (used >= MONTHLY_EXTRACTION_CAP) return { ok: false, remaining: 0 };

  // Stamped now, so the slot is spent whether or not the model comes back with
  // anything. Also what makes a re-run of this same call free — it is already
  // inside the window and excluded from its own count.
  await prisma.meeting.update({
    where: { id: params.meetingId },
    data: { issuesExtractedAt: new Date() },
  });

  return { ok: true, remaining: MONTHLY_EXTRACTION_CAP - used - 1 };
}
