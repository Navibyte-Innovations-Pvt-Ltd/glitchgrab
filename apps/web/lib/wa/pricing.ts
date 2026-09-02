import type { WaTemplateCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { WaError } from "./errors";

/**
 * Per-category pricing.
 *
 * Meta charges per message per category, and the categories are not close to
 * each other — marketing costs a multiple of utility in India, and service
 * messages inside the 24-hour window are free. A single blended rate looks fine
 * while a tenant sends reminders and loses money the day they run a marketing
 * broadcast, which is the feature they will use most.
 *
 * So there is no such thing as "the" price here. Everything is keyed by
 * category, and `metaCostPaise` is recorded alongside what we charge so margin
 * is inspectable per message rather than reconstructed later from an invoice.
 */

export interface ResolvedPrice {
  category: WaTemplateCategory;
  metaCostPaise: number;
  /** What we charge the platform. */
  platformPricePaise: number;
  /** What the platform charges its tenant — the platform's own decision. */
  tenantPricePaise: number;
}

/**
 * The rule in force right now: newest `effectiveFrom` that is not in the future.
 * Future-dated rows are how a price change is scheduled without a deploy.
 */
export async function resolvePrice(
  platformId: string,
  category: WaTemplateCategory
): Promise<ResolvedPrice> {
  const rule = await prisma.waPriceRule.findFirst({
    where: { platformId, category, effectiveFrom: { lte: new Date() } },
    orderBy: { effectiveFrom: "desc" },
    select: {
      category: true,
      metaCostPaise: true,
      platformPricePaise: true,
      tenantPricePaise: true,
    },
  });

  if (!rule) {
    throw new WaError(
      "NO_PRICE_RULE",
      `No price configured for ${category}. Set one before sending.`,
      409,
      { category }
    );
  }

  return rule;
}

export interface PriceRuleInput {
  category: WaTemplateCategory;
  metaCostPaise: number;
  platformPricePaise: number;
  tenantPricePaise: number;
  effectiveFrom?: Date;
}

/**
 * Writes new rules. Rules are never updated in place — a new row with a later
 * `effectiveFrom` supersedes, so every message stays attributable to the price
 * that applied when it was sent.
 */
export async function setPrices(platformId: string, rules: PriceRuleInput[]) {
  for (const rule of rules) {
    for (const [field, value] of Object.entries({
      metaCostPaise: rule.metaCostPaise,
      platformPricePaise: rule.platformPricePaise,
      tenantPricePaise: rule.tenantPricePaise,
    })) {
      if (!Number.isInteger(value) || value < 0) {
        throw new WaError("INVALID_AMOUNT", `${field} must be a non-negative integer (paise)`, 400);
      }
    }
    // Selling below cost is legal — a platform may loss-lead on marketing — but
    // it is far more often a typo, so it is worth refusing rather than absorbing.
    if (rule.platformPricePaise < rule.metaCostPaise) {
      throw new WaError(
        "INVALID_AMOUNT",
        `platformPricePaise (${rule.platformPricePaise}) is below metaCostPaise (${rule.metaCostPaise}) for ${rule.category}`,
        400,
        { category: rule.category }
      );
    }
  }

  return prisma.$transaction(
    rules.map((rule) =>
      prisma.waPriceRule.create({
        data: {
          platformId,
          category: rule.category,
          metaCostPaise: rule.metaCostPaise,
          platformPricePaise: rule.platformPricePaise,
          tenantPricePaise: rule.tenantPricePaise,
          effectiveFrom: rule.effectiveFrom ?? new Date(),
        },
        select: { id: true, category: true, effectiveFrom: true },
      })
    )
  );
}

/** Every category's current rule, for a platform's pricing screen. */
export async function listCurrentPrices(platformId: string): Promise<ResolvedPrice[]> {
  const categories: WaTemplateCategory[] = ["MARKETING", "UTILITY", "AUTHENTICATION", "SERVICE"];
  const resolved = await Promise.all(
    categories.map(async (category) => {
      try {
        return await resolvePrice(platformId, category);
      } catch {
        return null;
      }
    })
  );
  return resolved.filter((r): r is ResolvedPrice => r !== null);
}
