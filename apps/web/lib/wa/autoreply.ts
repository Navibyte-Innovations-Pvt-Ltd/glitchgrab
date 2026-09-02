import type { WaMatchType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { WaError } from "./errors";

/**
 * Autoreply rules.
 *
 * Evaluated on every inbound message, in priority order, first match wins.
 * Nothing cascades: two rules that both match would otherwise send two replies
 * to one message, which reads as a broken bot and burns the tenant's quality
 * rating.
 */

/** A rule that matches everything is legitimate, but only as a last resort. */
const CATCH_ALL_MIN_PRIORITY = 900;

interface RuleInput {
  name: string;
  matchType: WaMatchType;
  pattern?: string;
  replyText: string;
  priority?: number;
  enabled?: boolean;
}

/**
 * REGEX is intentionally not supported.
 *
 * A tenant-supplied pattern is a denial-of-service vector: `(a+)+$` backtracks
 * exponentially and pins the webhook handler — which Meta then throttles for
 * *every* tenant, not just the one who wrote it. Length caps and a compile check
 * do not prevent that; only a linear-time engine or a pattern analyser would,
 * and neither is worth a dependency for a feature the other four match types
 * already cover.
 *
 * The enum value survives so existing rows keep deserialising, but nothing can
 * be written with it and the evaluator never matches it.
 */
const MAX_PATTERN_LENGTH = 200;
const MAX_REPLY_LENGTH = 4096;

function validateRule(rule: RuleInput): void {
  if (!rule.name?.trim()) throw new WaError("INVALID_AMOUNT", "Rule name is required", 400);
  if (!rule.replyText?.trim()) throw new WaError("INVALID_AMOUNT", "replyText is required", 400);
  if (rule.replyText.length > MAX_REPLY_LENGTH) {
    throw new WaError("INVALID_AMOUNT", `replyText exceeds ${MAX_REPLY_LENGTH} characters`, 400);
  }

  if (rule.matchType === "REGEX") {
    throw new WaError(
      "INVALID_AMOUNT",
      "Regular expressions are not supported. Use EXACT, CONTAINS, STARTS_WITH or ANY.",
      400
    );
  }

  if (rule.matchType === "ANY") {
    if ((rule.priority ?? 100) < CATCH_ALL_MIN_PRIORITY) {
      throw new WaError(
        "INVALID_AMOUNT",
        `A catch-all rule must have priority ${CATCH_ALL_MIN_PRIORITY} or higher, or it will shadow every other rule`,
        400
      );
    }
    return;
  }

  if (!rule.pattern?.trim()) {
    throw new WaError("INVALID_AMOUNT", `pattern is required for matchType ${rule.matchType}`, 400);
  }
  if (rule.pattern.length > MAX_PATTERN_LENGTH) {
    throw new WaError("INVALID_AMOUNT", `pattern exceeds ${MAX_PATTERN_LENGTH} characters`, 400);
  }

}

export async function createRule(tenantId: string, rule: RuleInput) {
  validateRule(rule);
  return prisma.waAutoreplyRule.create({
    data: {
      tenantId,
      name: rule.name.trim(),
      matchType: rule.matchType,
      pattern: rule.matchType === "ANY" ? null : (rule.pattern ?? "").trim(),
      replyText: rule.replyText,
      priority: rule.priority ?? 100,
      enabled: rule.enabled ?? true,
    },
    select: { id: true, name: true, matchType: true, pattern: true, priority: true, enabled: true },
  });
}

export async function updateRule(tenantId: string, ruleId: string, rule: RuleInput) {
  validateRule(rule);
  const existing = await prisma.waAutoreplyRule.findFirst({
    where: { id: ruleId, tenantId },
    select: { id: true },
  });
  if (!existing) throw new WaError("TENANT_NOT_FOUND", "No such rule", 404);

  return prisma.waAutoreplyRule.update({
    where: { id: ruleId },
    data: {
      name: rule.name.trim(),
      matchType: rule.matchType,
      pattern: rule.matchType === "ANY" ? null : (rule.pattern ?? "").trim(),
      replyText: rule.replyText,
      priority: rule.priority ?? 100,
      enabled: rule.enabled ?? true,
    },
    select: { id: true, name: true, matchType: true, pattern: true, priority: true, enabled: true },
  });
}

export async function deleteRule(tenantId: string, ruleId: string) {
  const { count } = await prisma.waAutoreplyRule.deleteMany({ where: { id: ruleId, tenantId } });
  if (count === 0) throw new WaError("TENANT_NOT_FOUND", "No such rule", 404);
}

export function listRules(tenantId: string) {
  return prisma.waAutoreplyRule.findMany({
    where: { tenantId },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      matchType: true,
      pattern: true,
      replyText: true,
      priority: true,
      enabled: true,
      matchCount: true,
      lastMatchAt: true,
    },
  });
}

/** Long inbound text is truncated before matching — see the regex note above. */
const MAX_MATCH_INPUT = 2000;

interface MatchedRule {
  id: string;
  name: string;
  replyText: string;
}

/**
 * The first enabled rule that matches, or null.
 *
 * Ordered by priority ascending so a specific rule beats a catch-all, which
 * `validateRule` forces to priority 900+.
 */
export async function matchRule(tenantId: string, text: string): Promise<MatchedRule | null> {
  const input = text.trim().slice(0, MAX_MATCH_INPUT);
  if (!input) return null;

  const rules = await prisma.waAutoreplyRule.findMany({
    where: { tenantId, enabled: true },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, matchType: true, pattern: true, replyText: true },
  });

  const haystack = input.toLowerCase();

  for (const rule of rules) {
    const needle = rule.pattern?.trim().toLowerCase() ?? "";
    let hit = false;

    switch (rule.matchType) {
      case "ANY":
        hit = true;
        break;
      case "EXACT":
        hit = haystack === needle;
        break;
      case "STARTS_WITH":
        hit = haystack.startsWith(needle);
        break;
      case "CONTAINS":
        hit = haystack.includes(needle);
        break;
      case "REGEX":
        // Unsupported, and refused on write. A row predating that rule must
        // skip silently rather than take the webhook down.
        hit = false;
        break;
    }

    if (hit) {
      // Fire-and-forget: an analytics counter must never delay a reply.
      void prisma.waAutoreplyRule
        .update({
          where: { id: rule.id },
          data: { matchCount: { increment: 1 }, lastMatchAt: new Date() },
        })
        .catch(() => undefined);

      return { id: rule.id, name: rule.name, replyText: rule.replyText };
    }
  }

  return null;
}
