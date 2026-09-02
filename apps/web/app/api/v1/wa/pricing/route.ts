export const dynamic = "force-dynamic";

import type { WaTemplateCategory } from "@prisma/client";
import { authenticatePlatform } from "@/lib/wa/auth";
import { setPrices, listCurrentPrices, type PriceRuleInput } from "@/lib/wa/pricing";
import { WaError } from "@/lib/wa/errors";
import { waOk, waFail } from "@/lib/wa/response";

const CATEGORIES: WaTemplateCategory[] = ["MARKETING", "UTILITY", "AUTHENTICATION", "SERVICE"];

/** Current rule per category — what the platform pays us and charges its tenants. */
export async function GET(request: Request) {
  try {
    const platform = await authenticatePlatform(request);
    return waOk({ prices: await listCurrentPrices(platform.id) });
  } catch (err) {
    return waFail(err);
  }
}

/**
 * Sets prices. A platform decides what it charges its own tenants; we decide
 * what it pays us, so `platformPricePaise` and `metaCostPaise` are ours to set
 * and are rejected from a platform key.
 *
 * Rules are never edited — a new row with a later `effectiveFrom` supersedes,
 * which keeps every past message attributable to the price that applied then.
 */
export async function POST(request: Request) {
  try {
    const platform = await authenticatePlatform(request);
    const body = (await request.json()) as { prices?: Array<Record<string, unknown>> };

    if (!Array.isArray(body.prices) || body.prices.length === 0) {
      throw new WaError("INVALID_AMOUNT", "prices must be a non-empty array", 400);
    }

    const current = await listCurrentPrices(platform.id);

    const rules: PriceRuleInput[] = body.prices.map((entry) => {
      const category = entry.category as WaTemplateCategory;
      if (!CATEGORIES.includes(category)) {
        throw new WaError("INVALID_AMOUNT", `Unknown category: ${String(entry.category)}`, 400);
      }

      const existing = current.find((c) => c.category === category);
      if (!existing) {
        throw new WaError(
          "NO_PRICE_RULE",
          `We have not set our own rate for ${category} yet — contact Glitchgrab before pricing it.`,
          409,
          { category }
        );
      }

      const tenantPricePaise = entry.tenantPricePaise;
      if (typeof tenantPricePaise !== "number" || !Number.isInteger(tenantPricePaise) || tenantPricePaise < 0) {
        throw new WaError("INVALID_AMOUNT", `tenantPricePaise must be a non-negative integer for ${category}`, 400);
      }

      // Our cost to the platform is carried forward untouched; only the
      // platform's own sell price is theirs to move.
      return {
        category,
        metaCostPaise: existing.metaCostPaise,
        platformPricePaise: existing.platformPricePaise,
        tenantPricePaise,
        effectiveFrom: entry.effectiveFrom ? new Date(String(entry.effectiveFrom)) : undefined,
      };
    });

    await setPrices(platform.id, rules);
    return waOk({ prices: await listCurrentPrices(platform.id) });
  } catch (err) {
    return waFail(err);
  }
}
