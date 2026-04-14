// In-memory TTL cache. Module-level Map survives across warm Vercel invocations
// but not cold starts, so expected hit rate is best-effort. Swappable for Redis
// later by replacing getCache/setCache; the call sites don't care.

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

export function getCache<T>(key: string): T | null {
  const entry = store.get(key) as Entry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function setCache<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  // Bounded size — evict oldest when over 500 entries
  if (store.size > 500) {
    const firstKey = store.keys().next().value;
    if (firstKey !== undefined) store.delete(firstKey);
  }
}

export const TTL = {
  TREE: 10 * 60 * 1000,
  FILE: 5 * 60 * 1000,
  SEARCH: 5 * 60 * 1000,
} as const;
