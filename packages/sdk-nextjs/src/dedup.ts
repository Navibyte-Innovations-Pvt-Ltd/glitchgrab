const DEFAULT_WINDOW_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 100;

const seen = new Map<string, number>();

function hashString(input: string): string {
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function topStackFrame(stack: string | undefined): string {
  if (!stack) return "";
  const lines = stack.split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("at ") || t.includes("@")) {
      return t;
    }
  }
  return "";
}

function stripUrlQuery(url: string | undefined): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    const q = url.indexOf("?");
    return q === -1 ? url : url.slice(0, q);
  }
}

export function computeSignature(params: {
  errorMessage: string | undefined;
  pageUrl: string | undefined;
  errorStack?: string | undefined;
}): string {
  const msg = params.errorMessage?.trim() ?? "";
  const page = stripUrlQuery(params.pageUrl);
  const frame = topStackFrame(params.errorStack);
  return hashString(`${msg}|${page}|${frame}`);
}

export function shouldSkipDuplicate(
  signature: string,
  windowMs: number = DEFAULT_WINDOW_MS,
  now: number = Date.now()
): boolean {
  const last = seen.get(signature);
  if (last !== undefined && now - last < windowMs) {
    return true;
  }
  seen.set(signature, now);

  if (seen.size > MAX_ENTRIES) {
    const cutoff = now - windowMs;
    for (const [sig, ts] of seen) {
      if (ts < cutoff) seen.delete(sig);
    }
    if (seen.size > MAX_ENTRIES) {
      const excess = seen.size - MAX_ENTRIES;
      const keys = Array.from(seen.keys()).slice(0, excess);
      for (const k of keys) seen.delete(k);
    }
  }
  return false;
}

export function clearDedupCache(): void {
  seen.clear();
}
