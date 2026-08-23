import crypto from "crypto";
import { prisma } from "@/lib/db";

/**
 * Auto-login behind the WhatsApp digest's "Open dashboard" button.
 *
 * Security model — every point is load-bearing:
 *  - The link is a bearer credential. It is minted server-side only, and only
 *    ever delivered to the WhatsApp number already verified on that user's
 *    account. There is no endpoint that mints one for an arbitrary user.
 *  - Single-use, consumed atomically in `lib/auth.ts` (`updateMany` on
 *    `usedAt: null` + `count === 1`), so a double-tap or a forwarded screenshot
 *    of the message cannot authorize twice.
 *  - 48-hour TTL: long enough to survive "I'll look at it tonight", short enough
 *    that it is dead before the digest after next.
 *  - Rate limited per user, so a bug in a cron loop cannot mint hundreds.
 *  - Minting NEVER throws. A digest must not fail to send because a token could
 *    not be made; the caller falls back to a plain link, which still works and
 *    merely costs a login.
 */

/** Long enough to read at breakfast and act on after dinner. */
const TTL_HOURS = 48;

/** Per user, per window. Far above two digests a day; a runaway loop trips it. */
const RATE_LIMIT_MAX = 40;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const SEPARATOR = ".";

/**
 * Stands in for the token when none could be minted.
 *
 * A bare leading separator would also encode "no token", but it makes the path
 * segment start with a dot — which Meta may reject when it validates the
 * resolved URL. A word is unambiguous to both, and can never collide with a real
 * token: those are UUIDs.
 */
const NO_TOKEN = "notoken";

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(input: string): string | null {
  try {
    const padded = input
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(input.length / 4) * 4, "=");
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return null;
  }
}

/**
 * Mint a single-use login token for a digest link.
 *
 * Returns null rather than throwing when a link should not exist — the caller
 * then sends a plain link to the same page. A notification must never be lost
 * because a token could not be made.
 */
export async function mintDigestLoginToken({
  userId,
  targetPath,
}: {
  userId: string;
  targetPath: string;
}): Promise<string | null> {
  try {
    const recent = await prisma.loginToken.count({
      where: { userId, createdAt: { gt: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) } },
    });
    if (recent >= RATE_LIMIT_MAX) {
      console.warn("[magic-login] rate limit hit for user", userId);
      return null;
    }

    const token = crypto.randomUUID();
    await prisma.loginToken.create({
      data: {
        token,
        userId,
        targetPath,
        purpose: "DIGEST_DEEPLINK",
        expiresAt: new Date(Date.now() + TTL_HOURS * 3600 * 1000),
      },
    });
    return token;
  } catch (err) {
    console.error("[magic-login] could not mint token", err);
    return null;
  }
}

/**
 * Pack a token and its destination into ONE WhatsApp URL-button variable.
 *
 * Meta allows a single variable appended to the button's approved base URL, and
 * percent-encodes special characters in that value — so `token?next=/dashboard`
 * cannot work: encoding the `?` and `=` turns the query into a literal path
 * segment. Instead the destination is base64url-encoded and joined to the token
 * with a `.`, so every character in the result (A–Z a–z 0–9 - _ .) is URL-safe
 * and survives verbatim:
 *
 *     <token>.<base64url(targetPath)>
 *
 * The `.` can never appear inside a UUID or a base64url body, so splitting on
 * the first one is unambiguous.
 */
export function encodeMagicSuffix(token: string | null, targetPath: string): string {
  return `${token ?? NO_TOKEN}${SEPARATOR}${toBase64Url(targetPath)}`;
}

/**
 * Split a `/magic-link/<segment>` path segment back into its parts.
 *
 * `targetPath` comes back RAW — it arrived from the URL and is therefore
 * attacker-supplied. Pass it through `safeTargetPath` before any redirect.
 */
export function decodeMagicSuffix(segment: string): {
  token: string;
  targetPath: string | null;
} {
  const index = segment.indexOf(SEPARATOR);
  if (index === -1) return { token: segment, targetPath: null };

  const token = segment.slice(0, index);
  const encoded = segment.slice(index + 1);
  return {
    // Normalise the "no token was minted" sentinel to empty, so every consumer
    // has one thing to check rather than two.
    token: token === NO_TOKEN ? "" : token,
    targetPath: encoded ? fromBase64Url(encoded) : null,
  };
}

/**
 * Only ever redirect to a path on this site.
 *
 * The destination rides in the URL, so it is attacker-controlled: without this,
 * a crafted link would log someone in and bounce them to an attacker's page,
 * carrying whatever the referrer leaks. Protocol-relative `//evil.com` is the
 * one that gets missed — it has no scheme but browsers treat it as absolute.
 */
export function safeTargetPath(path: string | null | undefined, fallback = "/dashboard"): string {
  if (!path) return fallback;
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.includes("\\")) return fallback;
  return path;
}

/**
 * The full URL for a digest button or an in-chat link.
 *
 * Falls back to a plain link when no token could be minted, so the button always
 * points somewhere sensible — one extra tap beats a dead button.
 */
export function magicLinkUrl(token: string | null, targetPath: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://glitchgrab.dev";
  if (!token) return `${base}${targetPath}`;
  return `${base}/magic-link/${encodeMagicSuffix(token, targetPath)}`;
}

/**
 * The value we pass as the template's URL-button variable.
 *
 * The button's approved prefix is `https://glitchgrab.dev/`, so this is
 * everything after it — including a `/`. Whether Meta percent-encodes that
 * slash is NOT verified: the older `daily_issue_reminder` button has passed a
 * path with a slash for months, but nothing here proves a click ever resolved.
 * `proxy.ts` therefore also accepts the encoded form, so both spellings land.
 */
export function magicButtonSuffix(token: string | null, targetPath: string): string {
  if (!token) return targetPath.replace(/^\//, "");
  return `magic-link/${encodeMagicSuffix(token, targetPath)}`;
}
