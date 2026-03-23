interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

const store = new Map<string, RateLimitEntry>();

const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Periodic cleanup of expired entries
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  // Don't block process exit
  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

/**
 * Checks and increments rate limit for a given token hash.
 * Default: 60 requests per 60 minutes.
 */
export function checkRateLimit(
  tokenHash: string,
  limit: number = DEFAULT_LIMIT,
  windowMs: number = DEFAULT_WINDOW_MS
): RateLimitResult {
  ensureCleanup();

  const now = Date.now();
  const entry = store.get(tokenHash);

  // If no entry or window expired, start fresh
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(tokenHash, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(resetAt),
    };
  }

  // Window still active — increment
  entry.count += 1;

  if (entry.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
    };
  }

  return {
    allowed: true,
    remaining: limit - entry.count,
    resetAt: new Date(entry.resetAt),
  };
}
