/**
 * Provisions a reselling platform (Abhyasika, SevaStack, PracticeStack).
 *
 * There is no self-serve subscriber signup and there should not be one until a
 * real third party asks. For our own products we insert the row by hand and
 * hand the key over directly.
 *
 * The key is printed ONCE and only its SHA-256 is stored. Losing it means
 * rotating, not recovering.
 *
 *   bun apps/web/scripts/wa-provision-platform.ts abhyasika "Abhyasika" \
 *     --callback https://abhyasika.example/api/glitchgrab/wa
 */
import { PrismaClient } from "@prisma/client";
import { generateWaPlatformKey, hashWaPlatformKey } from "../lib/wa/auth";

const prisma = new PrismaClient();

async function main() {
  const [slug, name, ...rest] = process.argv.slice(2);

  if (!slug || !name) {
    console.error("usage: wa-provision-platform.ts <slug> <name> [--callback <url>]");
    process.exit(1);
  }

  const callbackIndex = rest.indexOf("--callback");
  const callbackUrl = callbackIndex >= 0 ? rest[callbackIndex + 1] : undefined;

  const url = process.env.NEXT_POSTGRES_URL ?? "";
  if (!/localhost|127\.0\.0\.1/.test(url)) {
    console.error("Refusing to run: NEXT_POSTGRES_URL is not localhost.");
    console.error("Provision production platforms deliberately, not from a dev shell.");
    process.exit(1);
  }

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

  console.info(`\nPlatform created: ${platform.name} (${platform.slug})`);
  console.info(`  id:  ${platform.id}`);
  console.info(`  key: ${key}`);
  console.info(`\nStored hashed. This is the only time the key is shown.\n`);
  console.info("Next: set our per-category rates for this platform before it can send.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
