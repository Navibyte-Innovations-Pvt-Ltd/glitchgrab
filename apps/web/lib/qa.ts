import { randomBytes } from "crypto";

/**
 * Generate an unguessable capability token for a tester's /qa/<token> page.
 * The QA page is gated ONLY by this token (testers may have no GitHub/Glitchgrab
 * login), so it must be long and random.
 */
export function generateMagicToken(): string {
  return randomBytes(24).toString("base64url");
}

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://glitchgrab.dev";

/** Full URL to a tester's QA verification page. */
export function qaLink(token: string): string {
  return `${BASE_URL}/qa/${token}`;
}

/**
 * Parse a PR body/title for the GitHub "closing keywords" that auto-close
 * issues on merge: close/closes/closed, fix/fixes/fixed, resolve/resolves/resolved.
 * Returns the unique issue numbers referenced (same-repo `#N` form only).
 *
 * One PR often closes multiple issues ("Closes #12, fixes #14") — this is what
 * lets us fan out a separate QA check per issue.
 */
export function parseClosingIssueRefs(text: string | null | undefined): number[] {
  if (!text) return [];
  const re = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\b[\s:]+#(\d+)/gi;
  const nums = new Set<number>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    if (!Number.isNaN(n)) nums.add(n);
  }
  return [...nums];
}
