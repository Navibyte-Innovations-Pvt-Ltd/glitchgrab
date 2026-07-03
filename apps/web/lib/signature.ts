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

function topStackFrame(stack: string | null | undefined): string {
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

function stripUrlQuery(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    const q = url.indexOf("?");
    return q === -1 ? url : url.slice(0, q);
  }
}

// Folds dynamic values (record ids, UUIDs, line/col numbers) so occurrences of the
// same error with different embedded ids collapse to one signature.
function normalizeDynamicValues(s: string): string {
  return s
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "#")
    .replace(/\b0x[0-9a-f]+\b/gi, "#")
    .replace(/\d+/g, "#");
}

export function computeReportSignature(params: {
  errorMessage?: string | null;
  pageUrl?: string | null;
  errorStack?: string | null;
}): string | null {
  const msg = params.errorMessage?.trim();
  if (!msg) return null;
  const page = stripUrlQuery(params.pageUrl);
  const frame = topStackFrame(params.errorStack);
  return hashString(normalizeDynamicValues(`${msg}|${page}|${frame}`));
}

// Suppress same-signature errors within 24h regardless of issue state
export const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;
// If a GitHub issue was created for this signature in last 7 days, suppress new reports
export const OPEN_ISSUE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
