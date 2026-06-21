// Builds the events context handed to the narration model.
//
// Two jobs, both fixing real "the script said localhost:3333 / didn't name the
// product" bugs:
//  1. Strip the ORIGIN from every URL (event.url + meta.href) so the model never
//     sees — and can't echo — a host like "http://localhost:3333". Only the path
//     survives, which the prompt already turns into words ("the dashboard").
//  2. Derive a clean APP NAME from the captured page titles (navigate events) and
//     state it explicitly, so the script names the product ("My Abhyasika")
//     instead of guessing or reading a raw string.

interface CaptureEventish {
  type?: string;
  label?: string;
  url?: string;
  meta?: Record<string, unknown> | null;
  [k: string]: unknown;
}

// "http://localhost:3333/dashboard/abc?x=1#h" → "/dashboard/abc". Drops origin,
// query and hash. Non-URLs pass through unchanged.
export function stripOrigin(url?: unknown): string | undefined {
  if (typeof url !== "string" || !url) return undefined;
  try {
    const u = new URL(url);
    return u.pathname || "/";
  } catch {
    // Relative or malformed — keep only the path part, drop any query/hash.
    return url.replace(/[?#].*$/, "") || undefined;
  }
}

// Page titles are usually "Brand | SEO tail | more". The product name is the
// first segment, split on pipe / en/em dash / middot (NOT hyphen — brand names
// contain hyphens). Returns "" when nothing usable is found.
export function deriveAppName(events: CaptureEventish[]): string {
  // 1. The canonical app name (og:site_name) captured on navigate — reliable.
  for (const e of events) {
    const site = e.meta && (e.meta.site || e.meta.siteName || e.meta.appName);
    if (typeof site === "string" && site.trim()) return site.trim().slice(0, 40);
  }
  // 2. Fallback: brand from the FIRST navigate's page title (the landing page) —
  //    not any later SPA route label (those are junk: a stray "Meet" must never
  //    win). Split on pipe/dash/middot AND a SPACED hyphen ("BBC News - Breaking
  //    …" → "BBC News"); non-spaced hyphens stay (brand names like "Coca-Cola").
  const firstNav = events.find(
    (e) => e.type === "navigate" && typeof e.label === "string" && e.label.trim(),
  );
  if (firstNav && typeof firstNav.label === "string") {
    const first = firstNav.label.split(/\s*[|–—·]\s*|\s+-\s+/)[0].trim();
    if (first && first.length >= 2 && first.length <= 40) return first;
  }
  return "";
}

function sanitizeEvent(e: CaptureEventish): CaptureEventish {
  const out: CaptureEventish = { ...e };
  if ("url" in out) out.url = stripOrigin(out.url);
  if (out.meta && typeof out.meta === "object" && "href" in out.meta) {
    out.meta = { ...out.meta, href: stripOrigin((out.meta as Record<string, unknown>).href) };
  }
  return out;
}

interface ScriptContext {
  /** Sanitized events JSON for the prompt (no origins/hosts). */
  eventsJson: string;
  /** A line naming the product + forbidding hostnames, appended to the prompt. */
  appLine: string;
  /** The derived app name (may be ""). */
  appName: string;
}

export function buildScriptContext(events: unknown): ScriptContext {
  const list = Array.isArray(events) ? (events as CaptureEventish[]) : [];
  const appName = deriveAppName(list);
  const eventsJson = JSON.stringify(list.map(sanitizeEvent), null, 2);
  const appLine = appName
    ? `\n\nA likely product name (from page metadata) is "${appName}" — use it UNLESS the hero/heading/description text in the events clearly names the product differently or shows "${appName}" is just a page label, in which case prefer the name the page text actually conveys. NEVER say a hostname, domain, URL, or "localhost" out loud — refer to screens by name (e.g. "the dashboard"), never by their address.`
    : `\n\nName the product from the hero/heading/description text in the events. NEVER say a hostname, domain, URL, or "localhost" out loud — refer to screens by name, never by their address.`;
  return { eventsJson, appLine, appName };
}

// ── Script ordering validator ────────────────────────────────────────────────

export interface OrderedStep {
  /** Human-readable name for error messages. */
  name: string;
  /** Any one of these keywords appearing in the script counts as a match (case-insensitive). */
  keywords: string[];
}

export interface OrderCheckResult {
  ok: boolean;
  /** Pairs where the "earlier" step appears AFTER the "later" step in the script. */
  violations: Array<{ earlier: string; later: string }>;
}

/**
 * Checks that steps appear in the given order inside the narration script.
 * A step not found in the script is skipped (not treated as a violation) —
 * the model may have omitted a minor step entirely, which is fine.
 * Only when BOTH steps are present and in wrong order is it a violation.
 */
export function checkScriptOrder(script: string, steps: OrderedStep[]): OrderCheckResult {
  const lower = script.toLowerCase();

  const positions = steps.map((step) => {
    const hits = step.keywords
      .map((k) => lower.indexOf(k.toLowerCase()))
      .filter((p) => p !== -1);
    return hits.length > 0 ? Math.min(...hits) : -1;
  });

  const violations: Array<{ earlier: string; later: string }> = [];
  for (let i = 0; i < steps.length - 1; i++) {
    for (let j = i + 1; j < steps.length; j++) {
      const pi = positions[i];
      const pj = positions[j];
      if (pi !== -1 && pj !== -1 && pi > pj) {
        violations.push({ earlier: steps[i].name, later: steps[j].name });
      }
    }
  }

  return { ok: violations.length === 0, violations };
}

/**
 * Derives an ordered list of steps from note events so the route can check
 * the generated script respects event chronology. Only note events with a
 * meaningful label (≥4 chars, not a stray punctuation capture) are included.
 */
export function buildOrderedStepsFromEvents(events: CaptureEventish[]): OrderedStep[] {
  return events
    .filter(
      (e) =>
        e.type === "note" &&
        typeof e.label === "string" &&
        e.label.trim().length >= 4,
    )
    .map((e) => {
      const label = (e.label as string).trim();
      // Use the first ~40 chars as the primary keyword; also add the first word
      // so partial matches work (e.g. "Library Owner Manage students…" → "Library Owner").
      const primary = label.slice(0, 40);
      const firstWord = label.split(/\s+/).slice(0, 2).join(" ");
      const keywords = Array.from(new Set([primary, firstWord].filter((k) => k.length >= 3)));
      return { name: label.slice(0, 60), keywords };
    });
}
