import { prisma } from "@/lib/db";
import { MAX_TURNS } from "./prompt";

/**
 * The cost guard for the report assistant (#330).
 *
 * There is no metered billing in this product yet, so the guard is a hard cap
 * with a graceful landing: past the cap the assistant stops answering and the
 * dialog falls back to the plain form it has always had. A reporter is never
 * shown a failed submit because a quota ran out — the report still gets filed,
 * just without help writing it.
 *
 * The cap counts CONVERSATIONS per repo per calendar month, not messages. A
 * reporter whose bug needs a follow-up question costs the same as one whose
 * doesn't, so the model is free to ask when asking is the right move.
 */

/**
 * Conversations per repo per calendar month before the assistant goes quiet.
 *
 * Module-private on purpose: the cap is enforced here and nowhere else. A route
 * that imported it would be free to re-implement the check and drift from it.
 */
const MONTHLY_CONVERSATION_CAP = 50;

type QuotaDenial = "MONTHLY_CAP" | "TURN_CAP";

interface QuotaOk {
  ok: true;
  conversationId: string;
  /** Conversations left this month, after this one. Drives the dialog's notice. */
  remaining: number;
}

interface QuotaDenied {
  ok: false;
  reason: QuotaDenial;
}

type QuotaResult = QuotaOk | QuotaDenied;

function startOfMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

interface ClaimParams {
  repoId: string;
  /** Client-supplied id of an in-flight conversation. Absent = a new one. */
  conversationId?: string | null;
  tokenId?: string | null;
  userId?: string | null;
  testerId?: string | null;
}

/**
 * Claim one turn.
 *
 * A missing or unrecognised `conversationId` starts a new conversation — which
 * is the only path that spends monthly quota, and the only path a client can
 * take to spend it. That is deliberate: a client that forges someone else's
 * conversation id gains nothing but a shared turn counter, and a client that
 * omits it can only ever burn its own repo's cap, which is exactly what the cap
 * is for.
 *
 * The conversation is looked up scoped to `repoId`, so an id belonging to
 * another repo is treated as absent rather than adopted.
 */
export async function claimAssistTurn(params: ClaimParams): Promise<QuotaResult> {
  const { repoId, conversationId } = params;

  if (conversationId) {
    const existing = await prisma.aiAssistConversation.findFirst({
      where: { id: conversationId, repoId },
      select: { id: true, turns: true },
    });
    if (existing) {
      if (existing.turns >= MAX_TURNS) return { ok: false, reason: "TURN_CAP" };
      await prisma.aiAssistConversation.update({
        where: { id: existing.id },
        data: { turns: { increment: 1 } },
      });
      // Continuing a conversation costs no monthly quota — it was already paid
      // for on turn one. `remaining` is reported as the cap so the dialog never
      // renders a countdown mid-conversation.
      return { ok: true, conversationId: existing.id, remaining: MONTHLY_CONVERSATION_CAP };
    }
  }

  const used = await prisma.aiAssistConversation.count({
    where: { repoId, createdAt: { gte: startOfMonth(new Date()) } },
  });
  if (used >= MONTHLY_CONVERSATION_CAP) return { ok: false, reason: "MONTHLY_CAP" };

  const created = await prisma.aiAssistConversation.create({
    data: {
      repoId,
      turns: 1,
      tokenId: params.tokenId ?? null,
      userId: params.userId ?? null,
      testerId: params.testerId ?? null,
    },
    select: { id: true },
  });

  return {
    ok: true,
    conversationId: created.id,
    remaining: Math.max(0, MONTHLY_CONVERSATION_CAP - used - 1),
  };
}
