// Pure event sanitizers for capture sessions — no Next.js/Prisma deps so they
// are unit-testable in isolation. Imported by route.ts.

export const MAX_EVENTS = 2000;
export const MAX_EVENT_LABEL_LEN = 200;

export interface CaptureEvent {
  type: string;
  t: number;
  label?: string;
  tag?: string;
  url?: string;
  durationMs?: number;
  preview?: string;
  meta?: Record<string, string>;
  note?: string;
}

export function sanitizeEvents(raw: unknown): CaptureEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, MAX_EVENTS)
    .filter((e): e is Record<string, unknown> => e !== null && typeof e === "object")
    .map((e) => ({
      type: String(e.type ?? "unknown").slice(0, 50),
      t: typeof e.t === "number" ? Math.max(0, Math.floor(e.t)) : 0,
      label: typeof e.label === "string" ? e.label.slice(0, MAX_EVENT_LABEL_LEN) : undefined,
      tag: typeof e.tag === "string" ? e.tag.slice(0, 30) : undefined,
      url: typeof e.url === "string" ? e.url.slice(0, 500) : undefined,
      durationMs: typeof e.durationMs === "number" ? Math.floor(e.durationMs) : undefined,
      preview: typeof e.preview === "string" ? e.preview.slice(0, 100) : undefined,
      meta: sanitizeMeta(e.meta),
      note: typeof e.note === "string" ? e.note.slice(0, 200) : undefined,
    }));
}

// Keep the rich element descriptor, but bound every key/value to avoid bloat.
export function sanitizeMeta(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, string> = {};
  let n = 0;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (n >= 20) break;
    if (typeof v !== "string") continue;
    out[k.slice(0, 30)] = v.slice(0, 250);
    n++;
  }
  return Object.keys(out).length ? out : undefined;
}
