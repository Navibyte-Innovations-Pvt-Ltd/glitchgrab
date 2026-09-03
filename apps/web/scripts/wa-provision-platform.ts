/**
 * Provisions a reselling platform (Abhyasika, SevaStack, PracticeStack) and its
 * per-category prices.
 *
 * There is no self-serve subscriber signup and there should not be one until a
 * real third party asks. For our own products we insert the row by hand and
 * hand the key over directly.
 *
 * The key is printed ONCE and only its SHA-256 is stored. Losing it means
 * rotating, not recovering.
 *
 *   # local
 *   bun run scripts/wa-provision-platform.ts abhyasika "Abhyasika"
 *
 *   # production — the flag is deliberate friction, not decoration
 *   bun run scripts/wa-provision-platform.ts abhyasika "Abhyasika" --production
 *
 * Prices are per category because Meta charges per category, and the categories
 * differ by multiples. Defaults below are ILLUSTRATIVE — pull Meta's live India
 * rate card before quoting a platform anything.
 */
import { PrismaClient, type WaTemplateCategory } from "@prisma/client";
import { generateWaPlatformKey, hashWaPlatformKey } from "../lib/wa/auth";

const prisma = new PrismaClient();

/** paise. metaCost = what Meta charges us, platform = what we charge them,
 *  tenant = what they charge their owner (they can change this via the API). */
const DEFAULT_PRICES: Record<
  WaTemplateCategory,
  { metaCostPaise: number; platformPricePaise: number; tenantPricePaise: number }
> = {
  UTILITY: { metaCostPaise: 25, platformPricePaise: 50, tenantPricePaise: 100 },
  MARKETING: { metaCostPaise: 78, platformPricePaise: 120, tenantPricePaise: 200 },
  AUTHENTICATION: { metaCostPaise: 25, platformPricePaise: 50, tenantPricePaise: 100 },
  // Service conversations are free at Meta inside the 24h window; a platform
  // may still charge for them, so the row has to exist or sends fail.
  SERVICE: { metaCostPaise: 0, platformPricePaise: 0, tenantPricePaise: 0 },
};

async function main() {
  const argv = process.argv.slice(2);
  const isProduction = argv.includes("--production");
  const [slug, name] = argv.filter((a) => !a.startsWith("--"));

  if (!slug || !name) {
    console.error("usage: wa-provision-platform.ts <slug> <name> [--callback <url>] [--production]");
    process.exit(1);
  }

  const callbackIndex = argv.indexOf("--callback");
  const callbackUrl = callbackIndex >= 0 ? argv[callbackIndex + 1] : undefined;

  const url = process.env.NEXT_POSTGRES_URL ?? "";
  const isLocal = /@localhost[:/]|@127\.0\.0\.1[:/]/.test(url);

  if (!isLocal && !isProduction) {
    console.error("Refusing to run: NEXT_POSTGRES_URL is not localhost.");
    console.error("Pass --production if you really mean to provision against the live database.");
    process.exit(1);
  }
  if (isProduction && isLocal) {
    console.error("--production passed but the database is localhost. Check which .env is loaded.");
    process.exit(1);
  }

  console.info(isLocal ? "Database: localhost" : "Database: REMOTE (production)");

  const existing = await prisma.waPlatform.findUnique({ where: { slug } });
  if (existing) {
    console.error(`Platform "${slug}" already exists (${existing.id}).`);
    console.error("To rotate its key, write a rotate script — this one only creates.");
    process.exit(1);
  }

  const key = generateWaPlatformKey();
  const platform = await prisma.waPlatform.create({
    data: { slug, name, apiKeyHash: hashWaPlatformKey(key), callbackUrl },
    select: { id: true, slug: true, name: true },
  });

  // Without a price row for a category, every send of that category fails with
  // NO_PRICE_RULE — so seeding them is part of provisioning, not a later step.
  const categories = Object.keys(DEFAULT_PRICES) as WaTemplateCategory[];
  await prisma.waPriceRule.createMany({
    data: categories.map((category) => ({ platformId: platform.id, category, ...DEFAULT_PRICES[category] })),
  });

  console.info(`\nPlatform created: ${platform.name} (${platform.slug})`);
  console.info(`  id:  ${platform.id}`);
  console.info(`  key: ${key}`);
  console.info("\nStored hashed. This is the only time the key is shown.");
  console.info("\nPrices seeded (paise, meta cost -> our price -> their price):");
  for (const category of categories) {
    const p = DEFAULT_PRICES[category];
    console.info(`  ${category.padEnd(15)} ${p.metaCostPaise} -> ${p.platformPricePaise} -> ${p.tenantPricePaise}`);
  }
  console.info("\nThese are illustrative. Check Meta's live India rate card before billing anyone.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
