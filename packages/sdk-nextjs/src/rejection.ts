/**
 * Unhandled rejection reasons are not always `Error` instances. A rejection with
 * a plain object reason used to stringify to `"[object Object]"` — a title and a
 * body with no message, no stack and nothing to triage.
 *
 * `describeRejection` extracts the most useful *stable* message it can, plus the
 * `.stack` when one exists (cross-realm errors from extensions and iframes fail
 * `instanceof Error` but still carry a usable stack), plus a serialized dump of
 * the whole reason for the report metadata.
 */

/** Max length of the serialized reason stored in report metadata. */
const DETAILS_MAX_LENGTH = 1000;

/** Max length of a message rung promoted into `errorMessage`. */
const MESSAGE_MAX_LENGTH = 200;

export interface RejectionDescription {
  /** Short, stable message — safe to hash for dedup and to slice into an issue title. */
  message: string;
  /** Stack trace when the reason carries one, regardless of `instanceof Error`. */
  stack?: string;
  /** Full serialized reason for `metadata.rejectionReason`. Empty when unavailable. */
  details?: string;
}

/** A rejection with neither a message nor a stack cannot be triaged by anyone. */
export function isUnactionableRejection(description: RejectionDescription): boolean {
  if (description.stack) return false;
  const message = description.message.trim();
  return message === "" || message === "[object Object]";
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "[object Object]") return undefined;
  return trimmed.slice(0, MESSAGE_MAX_LENGTH);
}

/** `.code`/`.status` are often numbers — accept those, but never objects. */
function readScalar(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return readString(value);
}

function readStack(reason: unknown): string | undefined {
  try {
    const stack = (reason as { stack?: unknown } | null)?.stack;
    return typeof stack === "string" && stack.trim() !== "" ? stack : undefined;
  } catch {
    // Getters can throw — a missing stack is better than a crash.
    return undefined;
  }
}

/** `JSON.stringify` throws on circular refs and BigInt, and on throwing getters. */
function serialize(reason: unknown): string | undefined {
  try {
    const seen = new WeakSet<object>();
    const json = JSON.stringify(reason, (_key, value) => {
      if (typeof value === "bigint") return `${value}n`;
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
      }
      return value;
    });
    if (!json || json === "{}" || json === "null") return undefined;
    return json.slice(0, DETAILS_MAX_LENGTH);
  } catch {
    return undefined;
  }
}

/** Max own keys listed when falling back to a shape description. */
const SHAPE_MAX_KEYS = 5;

/**
 * Last resort when no stable field exists: name the reason's keys, not its values.
 * Stable across occurrences, so the dedup signature still collapses repeats.
 */
function describeShape(reason: unknown): string {
  try {
    const keys = Object.keys(reason as object);
    if (keys.length === 0) return "";
    const listed = keys.slice(0, SHAPE_MAX_KEYS).join(", ");
    const suffix = keys.length > SHAPE_MAX_KEYS ? ", …" : "";
    return `Rejected object: ${listed}${suffix}`.slice(0, MESSAGE_MAX_LENGTH);
  } catch {
    return "";
  }
}

/** Max length of a resource URL appended to an event message. */
const EVENT_URL_MAX_LENGTH = 120;

/**
 * Events cross realm boundaries (iframes, extensions) and fail `instanceof`,
 * and `Event` is undefined outside the DOM. Duck-type instead: every event
 * carries a string `type` and a boolean `isTrusted`.
 */
function isEventLike(reason: unknown): boolean {
  try {
    if (typeof Event !== "undefined" && reason instanceof Event) return true;
    const source = reason as { type?: unknown; isTrusted?: unknown } | null;
    return typeof source?.type === "string" && typeof source?.isTrusted === "boolean";
  } catch {
    return false;
  }
}

/**
 * A promise rejected with a DOM Event — a script/img/media `onerror`, an
 * IndexedDB request, a third-party embed — carries no `.message` and no
 * `.stack`. Its only own key in Chrome is `isTrusted`, so the shape fallback
 * produced "Rejected object: isTrusted": a report naming nothing at all.
 *
 * The event's own `type` and `target` say which resource failed, so read those
 * instead. The URL is stripped of its query and hash — a cache-busting param
 * would otherwise give every occurrence a unique dedup signature.
 */
function describeEvent(reason: unknown): string {
  const parts: string[] = [];

  try {
    const source = reason as { constructor?: { name?: string }; type?: unknown };
    const name = source.constructor?.name || "Event";
    parts.push(`${name} ("${String(source.type ?? "")}")`);
  } catch {
    parts.push("Event");
  }

  try {
    const target = (reason as { target?: unknown }).target as
      | (Element & { src?: string; href?: string; currentSrc?: string })
      | null
      | undefined;
    const tag = target?.tagName?.toLowerCase();
    if (tag) parts.push(`from <${tag}>`);
    const url =
      readString(target?.currentSrc) ?? readString(target?.src) ?? readString(target?.href);
    if (url) parts.push(`— ${url.split(/[?#]/)[0].slice(0, EVENT_URL_MAX_LENGTH)}`);
  } catch {
    // Cross-origin or detached targets throw on access — the type alone still
    // beats a key list.
  }

  return parts.join(" ").slice(0, MESSAGE_MAX_LENGTH);
}

export function describeRejection(reason: unknown): RejectionDescription {
  try {
    if (reason instanceof Error) {
      return {
        message: reason.message || reason.name || "",
        stack: reason.stack,
      };
    }

    const stack = readStack(reason);

    if (typeof reason === "string") {
      return { message: readString(reason) ?? "", stack };
    }
    if (typeof reason === "number" || typeof reason === "boolean") {
      return { message: String(reason), stack };
    }
    if (reason === null || reason === undefined) {
      return { message: "" };
    }

    const source = reason as Record<string, unknown>;
    const nestedError = source.error;

    // Stable rungs first — these keep the dedup signature and the issue title
    // meaningful. A volatile JSON dump would defeat both.
    const message =
      readString(source.message) ??
      readString(nestedError) ??
      readString((nestedError as { message?: unknown } | null | undefined)?.message) ??
      readScalar(source.code) ??
      readString(source.name) ??
      readScalar(source.status) ??
      readString(source.statusText) ??
      "";

    const details = serialize(reason);

    // No stable rung — describe the reason by its key *shape*, never by its values.
    // `errorMessage` feeds computeSignature, so a message carrying volatile fields
    // (requestId, timestamps) would give every occurrence a unique signature and
    // defeat dedup entirely. The values still travel in `details`.
    //
    // An event is the one shapeless reason worth reporting: its type and target
    // name the failing resource, so it gets a real message and stays actionable.
    return {
      message:
        message || (isEventLike(reason) ? describeEvent(reason) : describeShape(reason)),
      stack,
      details,
    };
  } catch {
    // Never throw out of the SDK — an empty description is dropped upstream.
    return { message: "" };
  }
}
