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
  // 2. Fallback: first segment of a page title (split on pipe/dash/middot, NOT
  //    hyphen). Less reliable — a title can lead with the page name, not the brand.
  for (const e of events) {
    if (e.type === "navigate" && typeof e.label === "string" && e.label.trim()) {
      const first = e.label.split(/\s*[|–—·]\s*/)[0].trim();
      if (first && first.length >= 2 && first.length <= 40) return first;
    }
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

export interface ScriptContext {
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
    ? `\n\nThe product/app being shown is "${appName}". Name it as "${appName}". NEVER say a hostname, domain, URL, or "localhost" out loud — refer to screens by name (e.g. "the dashboard"), never by their address.`
    : `\n\nNEVER say a hostname, domain, URL, or "localhost" out loud — refer to screens by name, never by their address.`;
  return { eventsJson, appLine, appName };
}
