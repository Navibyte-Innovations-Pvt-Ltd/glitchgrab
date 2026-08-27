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
  /**
   * Which round-trip this is, 1-based. The transcript rows are stamped with it
   * so "prompts per filed issue" is a MAX over a conversation's messages rather
   * than a count that double-counts a resent history.
   */
  turn: number;
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
  /**
   * Who is typing, as the host app knows them. The credential ids above say
   * which key was used; one SDK token covers every end user of the host app, so
   * without this every stranger's chat is attributed to the same row.
   */
  reporterKey?: string | null;
  reporterName?: string | null;
  reporterEmail?: string | null;
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
      select: { id: true, turns: true, reporterKey: true },
    });
    if (existing) {
      if (existing.turns >= MAX_TURNS) return { ok: false, reason: "TURN_CAP" };
      const updated = await prisma.aiAssistConversation.update({
        where: { id: existing.id },
        data: {
          turns: { increment: 1 },
          // Late-arriving identity: the SDK only knows who is logged in if the
          // host passed a `session`, and a host can start passing one mid-chat.
          // Never overwrite what is already there — the first attribution is
          // the honest one.
          ...(existing.reporterKey ? {} : identityOf(params)),
        },
        select: { turns: true },
      });
      // Continuing a conversation costs no monthly quota — it was already paid
      // for on turn one. `remaining` is reported as the cap so the dialog never
      // renders a countdown mid-conversation.
      return {
        ok: true,
        conversationId: existing.id,
        turn: updated.turns,
        remaining: MONTHLY_CONVERSATION_CAP,
      };
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
      ...identityOf(params),
    },
    select: { id: true },
  });

  return {
    ok: true,
    conversationId: created.id,
    turn: 1,
    remaining: Math.max(0, MONTHLY_CONVERSATION_CAP - used - 1),
  };
}

/** Reporter identity, trimmed and bounded — it arrives from a client body. */
function identityOf(params: ClaimParams) {
  const clip = (value?: string | null) => {
    const text = typeof value === "string" ? value.trim().slice(0, 200) : "";
    return text.length > 0 ? text : null;
  };
  return {
    reporterKey: clip(params.reporterKey),
    reporterName: clip(params.reporterName),
    reporterEmail: clip(params.reporterEmail),
  };
}

/**
 * Point a filed report at the chat that produced it, and close the chat out.
 *
 * This is the join that makes the whole transcript store worth keeping: with it
 * "how many prompts does an issue cost" is `turns` on the conversations that
 * have a report, measured against the ones that never got one.
 *
 * The id crosses a submit boundary, so it is client-supplied and untrusted —
 * looked up scoped to the report's own repo, exactly like `claimAssistTurn`
 * does, and ignored when it belongs to someone else. Never throws: a report is
 * already filed by the time this runs and an analytics write must not undo it.
 */
export async function linkConversationToReport(params: {
  conversationId?: string | null;
  repoId: string;
  reportId: string;
}): Promise<void> {
  const { conversationId, repoId, reportId } = params;
  if (!conversationId) return;
  try {
    const conversation = await prisma.aiAssistConversation.findFirst({
      where: { id: conversationId, repoId },
      select: { id: true, outcome: true },
    });
    if (!conversation) return;
    await prisma.report.update({
      where: { id: reportId },
      data: { aiAssistConversationId: conversation.id },
    });
    // "SOLVED" outranks it: that conversation ended with the brief answering
    // the question, and a report filed afterwards is a separate decision.
    if (!conversation.outcome) {
      await prisma.aiAssistConversation.update({
        where: { id: conversation.id },
        data: { outcome: "FILED" },
      });
    }
  } catch {
    // Nothing to do — the report stands either way.
  }
}

/**
 * Record how a conversation ended.
 *
 * "SOLVED": the project's own brief answered the question and nothing was
 * filed. "FILED" is written by `linkConversationToReport` when a report comes
 * out the other end. That number is the argument for keeping GLITCH.md
 * up to date — a team can see how many people it unstuck, and which question
 * keeps coming back and should have been a fix instead of a paragraph.
 *
 * Never throws: an analytics write must not fail a reply the reporter is
 * waiting on.
 */
export async function markConversationOutcome(
  conversationId: string,
  outcome: "SOLVED" | "FILED"
): Promise<void> {
  try {
    await prisma.aiAssistConversation.update({
      where: { id: conversationId },
      data: { outcome },
    });
  } catch {
    // Nothing to do — the conversation may have been pruned.
  }
}
