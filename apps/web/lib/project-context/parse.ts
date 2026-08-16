import { CONTEXT_KINDS, MIN_CONFIDENCE, type ContextKindName } from "./prompt";

/**
 * Parse the model's distillation output.
 *
 * Models fence JSON, prepend "Here is the array:", and occasionally return a
 * bare object instead of an array. This is deliberately forgiving about the
 * wrapper and completely unforgiving about the contents — a malformed item is
 * dropped, never coerced into a plausible-looking fact.
 */

export interface ParsedContextItem {
  kind: ContextKindName;
  text: string;
  confidence: number;
}

/** Longer than this and it stopped being a fact and started being a summary. */
const MAX_TEXT_LENGTH = 400;
/** Matches the prompt's own cap — a model ignoring it doesn't get to flood the timeline. */
const MAX_ITEMS = 8;

/** Strip ```json fences and any lead-in prose, then isolate the array. */
function extractJsonArray(raw: string): string | null {
  const text = raw.trim();

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced ? fenced[1] : text).trim();

  const start = body.indexOf("[");
  const end = body.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;

  return body.slice(start, end + 1);
}

function isKind(value: unknown): value is ContextKindName {
  return typeof value === "string" && (CONTEXT_KINDS as readonly string[]).includes(value);
}

/**
 * Returns the valid items only. An unparseable response yields `[]` rather than
 * throwing: a distillation that produced nothing is a normal outcome, and the
 * caller reports the count either way.
 */
export function parseDistillation(raw: string): ParsedContextItem[] {
  const json = extractJsonArray(raw);
  if (!json) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const items: ParsedContextItem[] = [];
  const seen = new Set<string>();

  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;

    if (!isKind(row.kind)) continue;

    const text = typeof row.text === "string" ? row.text.trim() : "";
    if (!text || text.length > MAX_TEXT_LENGTH) continue;

    // A missing confidence means the model skipped the field, not that it was
    // certain — treat it as the floor so an unrated item still has to clear it.
    const confidence = typeof row.confidence === "number" ? row.confidence : MIN_CONFIDENCE;
    if (!Number.isFinite(confidence) || confidence < MIN_CONFIDENCE) continue;

    // Same sentence twice in one response is a model slip, not two facts.
    const key = `${row.kind}:${text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({
      kind: row.kind,
      text,
      confidence: Math.min(confidence, 1),
    });

    if (items.length >= MAX_ITEMS) break;
  }

  return items;
}
