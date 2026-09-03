"use server";

import { revalidatePath } from "next/cache";
import type { WaTemplateCategory } from "@prisma/client";
import { auth, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateWaPlatformKey, hashWaPlatformKey } from "@/lib/wa/auth";
import { credit, getBalance } from "@/lib/wa/wallet";
import { listCurrentPrices, setPrices } from "@/lib/wa/pricing";

/**
 * Managing the products that resell our WhatsApp infra.
 *
 * Deliberately NOT under /org/[slug]: a `WaPlatform` has no org, because it is a
 * Navibyte business relationship rather than anything to do with a GitHub repo.
 * The gate is the existing `ADMIN_EMAILS` allowlist, which fails closed when
 * unset.
 *
 * This is not self-serve signup — a stranger cannot reach any of it. It exists
 * because provisioning our own platforms previously meant running a CLI script
 * with a hand-built production database URL, which is a bad way to touch live
 * billing.
 */

const PATH = "/admin/whatsapp-platforms";

async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.email) return { ok: false, error: "Unauthorized" };
  if (!isAdminEmail(session.user.email)) return { ok: false, error: "Not an admin" };
  return { ok: true };
}

/** paise. Illustrative — Meta's India rate card is the real source. */
const DEFAULT_PRICES: Record<
  WaTemplateCategory,
  { metaCostPaise: number; platformPricePaise: number; tenantPricePaise: number }
> = {
  UTILITY: { metaCostPaise: 25, platformPricePaise: 50, tenantPricePaise: 100 },
  MARKETING: { metaCostPaise: 78, platformPricePaise: 120, tenantPricePaise: 200 },
  AUTHENTICATION: { metaCostPaise: 25, platformPricePaise: 50, tenantPricePaise: 100 },
  SERVICE: { metaCostPaise: 0, platformPricePaise: 0, tenantPricePaise: 0 },
};

export interface PlatformRow {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  callbackUrl: string | null;
  createdAt: string;
  tenantCount: number;
  balancePaise: number;
}

export async function listPlatforms(): Promise<PlatformRow[]> {
  const gate = await requireAdmin();
  if (!gate.ok) return [];

  const platforms = await prisma.waPlatform.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      active: true,
      callbackUrl: true,
      createdAt: true,
      _count: { select: { tenants: true } },
    },
  });

  return Promise.all(
    platforms.map(async (p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      active: p.active,
      callbackUrl: p.callbackUrl,
      createdAt: p.createdAt.toISOString(),
      tenantCount: p._count.tenants,
      balancePaise: (await getBalance("PLATFORM", p.id)).balancePaise,
    }))
  );
}

/**
 * Creates a platform and seeds its prices.
 *
 * The key is returned exactly once and only its SHA-256 is stored, so it can
 * never be shown again — same guarantee as the CLI script. Prices are seeded
 * here rather than left to a later step because a category with no price rule
 * fails every send with NO_PRICE_RULE.
 */
export async function createPlatform(input: {
  slug: string;
  name: string;
  callbackUrl?: string;
}): Promise<{ ok: true; key: string; id: string } | { ok: false; error: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const slug = input.slug.trim().toLowerCase();
  const name = input.name.trim();

  if (!/^[a-z0-9-]{2,40}$/.test(slug)) {
    return { ok: false, error: "Slug must be 2–40 lowercase letters, numbers or hyphens" };
  }
  if (!name) return { ok: false, error: "Name is required" };

  const existing = await prisma.waPlatform.findUnique({ where: { slug }, select: { id: true } });
  if (existing) return { ok: false, error: `Platform "${slug}" already exists` };

  const key = generateWaPlatformKey();
  const platform = await prisma.waPlatform.create({
    data: {
      slug,
      name,
      apiKeyHash: hashWaPlatformKey(key),
      callbackUrl: input.callbackUrl?.trim() || null,
    },
    select: { id: true },
  });

  const categories = Object.keys(DEFAULT_PRICES) as WaTemplateCategory[];
  await prisma.waPriceRule.createMany({
    data: categories.map((category) => ({
      platformId: platform.id,
      category,
      ...DEFAULT_PRICES[category],
    })),
  });

  revalidatePath(PATH);
  return { ok: true, key, id: platform.id };
}

/**
 * Issues a new key and invalidates the old one immediately.
 *
 * The remedy for a leaked key. It reaches every library's WhatsApp number, so
 * the alternative — hand-written SQL against production during an incident — is
 * the worst possible time to be improvising.
 */
export async function rotatePlatformKey(
  platformId: string
): Promise<{ ok: true; key: string } | { ok: false; error: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const key = generateWaPlatformKey();
  const updated = await prisma.waPlatform.updateMany({
    where: { id: platformId },
    data: { apiKeyHash: hashWaPlatformKey(key) },
  });
  if (updated.count === 0) return { ok: false, error: "No such platform" };

  revalidatePath(PATH);
  return { ok: true, key };
}

/**
 * The kill switch. Every call from this platform 403s immediately, including
 * sends that are mid-flight from their side.
 */
export async function setPlatformActive(
  platformId: string,
  active: boolean
): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const updated = await prisma.waPlatform.updateMany({ where: { id: platformId }, data: { active } });
  if (updated.count === 0) return { ok: false, error: "No such platform" };

  revalidatePath(PATH);
  return { ok: true };
}

export async function getPlatformPrices(platformId: string) {
  const gate = await requireAdmin();
  if (!gate.ok) return [];
  return listCurrentPrices(platformId);
}

/**
 * Writes new price rules.
 *
 * Rules are never edited in place — a new row with a later `effectiveFrom`
 * supersedes, so every message already sent stays attributable to the price that
 * applied when it was sent.
 */
export async function updatePlatformPrices(
  platformId: string,
  rules: {
    category: WaTemplateCategory;
    metaCostPaise: number;
    platformPricePaise: number;
    tenantPricePaise: number;
  }[]
): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  try {
    await setPrices(platformId, rules);
    revalidatePath(PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save prices" };
  }
}

/** Tops up a platform's own wallet — the balance that pays us. */
export async function creditPlatformWallet(
  platformId: string,
  amountPaise: number,
  note?: string
): Promise<{ ok: boolean; balancePaise?: number; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    return { ok: false, error: "Amount must be a positive whole number of paise" };
  }

  try {
    const balance = await credit({
      ownerType: "PLATFORM",
      ownerId: platformId,
      amountPaise,
      note: note?.trim() || "Manual top-up from admin",
    });
    revalidatePath(PATH);
    return { ok: true, balancePaise: balance.balancePaise };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not credit wallet" };
  }
}

/** Which businesses connected under a platform, and what they connected. */
export async function listTenants(platformId: string) {
  const gate = await requireAdmin();
  if (!gate.ok) return [];

  const tenants = await prisma.waTenant.findMany({
    where: { platformId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      externalOwnerId: true,
      name: true,
      status: true,
      wabaId: true,
      creditLineShared: true,
      connectedAt: true,
      numbers: {
        select: { displayNumber: true, verifiedName: true, status: true, qualityRating: true },
      },
    },
  });

  return Promise.all(
    tenants.map(async (t) => ({
      ...t,
      connectedAt: t.connectedAt?.toISOString() ?? null,
      balancePaise: (await getBalance("TENANT", t.id)).balancePaise,
    }))
  );
}
