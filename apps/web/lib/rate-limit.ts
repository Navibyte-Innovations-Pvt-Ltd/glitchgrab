import { prisma } from "@/lib/db";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Checks and increments rate limit for a given key.
 * Backed by a DB row (not in-memory) so counts are shared across
 * serverless instances/cold starts. The insert/update is a single
 * atomic statement to avoid race conditions between concurrent requests.
 * Default: 60 requests per 60 minutes.
 */
export async function checkRateLimit(
  key: string,
  limit: number = DEFAULT_LIMIT,
  windowMs: number = DEFAULT_WINDOW_MS
): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN ${resetAt} ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"
  `;

  const entry = rows[0];

  if (entry.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  return {
    allowed: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}
