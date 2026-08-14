/**
 * Redaction for anything scraped off the wire. Error response bodies are the
 * one place the SDK copies server output verbatim, and servers echo back tokens,
 * emails and password-reset links in their error envelopes.
 */

const SENSITIVE_KEY_RE =
  /(pass|pwd|secret|token|auth|session|cookie|credential|apikey|api_key|access_key|private|signature|otp|pin|cvv|card|ssn|aadhaar|pan)/i;

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const JWT_RE = /\beyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,}\b/g;
const BEARER_RE = /\b(bearer\s+)[\w-.~+/]{12,}=*/gi;

/** Longest error body kept. Enough for a stack or a validation list, not a page. */
export const MAX_BODY_LENGTH = 500;

function redactString(value: string): string {
  return value
    .replace(JWT_RE, "[REDACTED]")
    .replace(BEARER_RE, "$1[REDACTED]")
    .replace(EMAIL_RE, "[REDACTED_EMAIL]");
}

function redactValue(value: unknown, depth: number): unknown {
  if (depth > 4) return "[DEPTH]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redactValue(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_RE.test(key) ? "[REDACTED]" : redactValue(inner, depth + 1);
    }
    return out;
  }
  return String(value);
}

/**
 * Redact and truncate a response body for breadcrumb metadata.
 * JSON is walked key-by-key so sensitive fields are dropped by name; anything
 * else is treated as opaque text and only pattern-scrubbed. Never throws.
 */
export function redactBody(body: string, maxLength: number = MAX_BODY_LENGTH): string {
  try {
    const trimmed = body.trim();
    if (!trimmed) return "";

    let result: string;
    try {
      result = JSON.stringify(redactValue(JSON.parse(trimmed), 0));
    } catch {
      // Not JSON — HTML error pages, plain text, stack dumps.
      result = redactString(trimmed);
    }

    return result.length > maxLength ? `${result.slice(0, maxLength)}…[truncated]` : result;
  } catch {
    return "";
  }
}
