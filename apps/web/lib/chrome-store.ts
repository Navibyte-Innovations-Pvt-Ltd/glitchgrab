import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encrypt";

/**
 * Chrome Web Store, read side (#332).
 *
 * A release workflow can upload and submit, then it exits — and the answer
 * ("published", "still in review", "rejected, fix your description") lands
 * hours or days later on a dashboard nobody has open. Every extension we ship
 * has at some point sat in Draft for a week while everyone assumed it was live.
 * This module is what lets a cron ask.
 *
 * v2 of the API on purpose: it is the version that exposes the *submitted*
 * revision alongside the published one, which is the whole question. v1 could
 * only show you the draft.
 *
 * **The v2 API has no list endpoint.** Its discovery document offers exactly
 * five methods — fetchStatus, publish, cancelSubmission,
 * setPublishedDeployPercentage, upload — so a connected account cannot be asked
 * "which extensions do you have?". The ids have to be typed. Don't go looking
 * for that endpoint again.
 *
 * Auth is a **connected Google account**, not a service-account key file. The
 * key-file path also required a *group* publisher account to add the service
 * account as a user, which a personal publisher account cannot do at all — a
 * dead end rather than a chore.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://chromewebstore.googleapis.com/v2";

/**
 * Read-only, deliberately.
 *
 * The full `chromewebstore` scope can publish to every existing user of every
 * extension on the account. The watcher only ever asks what the store thinks,
 * so connecting for status must not hand over the ability to ship.
 */
const SCOPES = [
  "https://www.googleapis.com/auth/chromewebstore.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

/** Coarse on purpose — see the enum comment in schema.prisma. */
type ReviewState = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "NEEDS_ATTENTION" | "UNKNOWN";

interface ItemStatus {
  state: ReviewState;
  publishedVersion: string | null;
  submittedVersion: string | null;
  /** Whatever the store said, kept verbatim for the message a human reads. */
  detail: string | null;
}

/** Cookie carrying the nonce that ties an OAuth state to THIS browser. */
export const STORE_STATE_COOKIE = "gg_cws_oauth";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "";
}

function redirectUri(): string {
  return `${appUrl()}/api/v1/extensions/callback`;
}

function signState(payload: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "").update(payload).digest("hex");
}

/** Constant-time compare — a nonce check must not leak by timing. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Start the connect flow.
 *
 * Returns the nonce with the URL; the caller sets it as an httpOnly cookie. A
 * signed state alone only proves *we* minted it, not that the browser
 * finishing the flow is the one that started it — without that binding an
 * attacker can mint a state for their own account, get the victim to complete
 * consent, and end up holding the victim's store access.
 */
export function buildStoreAuthUrl(userId: string): { url: string; nonce: string } {
  const nonce = randomBytes(32).toString("base64url");
  const payload = JSON.stringify({ userId, nonce, ts: Date.now() });
  const state = Buffer.from(JSON.stringify({ payload, sig: signState(payload) })).toString(
    "base64url"
  );

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    // Without offline + consent Google returns no refresh token, and the
    // connection silently dies an hour later.
    access_type: "offline",
    prompt: "select_account consent",
    state,
  });

  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`, nonce };
}

/** Verify the state and recover the user it was minted for. */
export function parseStoreState(
  state: string,
  cookieNonce: string | undefined
): { userId: string } | null {
  try {
    const { payload, sig } = JSON.parse(Buffer.from(state, "base64url").toString()) as {
      payload: string;
      sig: string;
    };
    if (!safeEqual(sig, signState(payload))) return null;

    const parsed = JSON.parse(payload) as { userId: string; nonce: string; ts: number };
    // Fifteen minutes is longer than any consent screen takes and short enough
    // that a leaked link is useless by the time it is found.
    if (Date.now() - parsed.ts > 15 * 60_000) return null;
    if (!cookieNonce || !safeEqual(parsed.nonce, cookieNonce)) return null;

    return { userId: parsed.userId };
  } catch {
    return null;
  }
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
}

/** Trade the callback code for tokens. */
export async function exchangeStoreCode(code: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) throw new Error(`Google refused the code: ${await res.text()}`);
  return (await res.json()) as TokenResponse;
}

/** Which Google account just connected, so the UI can name it. */
export async function fetchConnectedEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Could not read the connected account");
  return ((await res.json()) as { email?: string }).email ?? "";
}

/**
 * A usable access token for one connection.
 *
 * Refresh tokens are the thing that lasts, and the thing that breaks: a consent
 * screen left in **Testing** issues refresh tokens that expire after 7 days,
 * which is precisely the failure the old rotation cron existed to paper over.
 * When Google refuses one, the reason is written to the row so the dashboard
 * can say "reconnect" instead of showing a silent, permanent zero.
 */
export async function accessTokenForConnection(connectionId: string): Promise<string | null> {
  const connection = await prisma.storeConnection.findUnique({
    where: { id: connectionId },
    select: { id: true, refreshToken: true },
  });
  if (!connection) return null;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: decrypt(connection.refreshToken),
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    await prisma.storeConnection.update({
      where: { id: connection.id },
      data: { lastError: `Google refused the connection (${res.status}): ${body}` },
    });
    return null;
  }

  await prisma.storeConnection.update({
    where: { id: connection.id },
    data: { lastError: null },
  });

  return ((await res.json()) as TokenResponse).access_token;
}

interface RevisionStatus {
  version?: string;
  state?: string;
  reviewState?: string;
  status?: string;
  reviewSummary?: string;
  reviewComment?: string;
}

/**
 * Fold the store's vocabulary into ours.
 *
 * Matched on substrings rather than an exact set: Google has renamed these
 * states before, and an unrecognised value must degrade to UNKNOWN — never to
 * "published", which would silence exactly the alert this feature exists for.
 */
function foldState(raw: string | undefined): ReviewState | null {
  if (!raw) return null;
  const value = raw.toUpperCase();
  if (/REJECT|TAKEN.?DOWN|VIOLATION|SUSPEND/.test(value)) return "NEEDS_ATTENTION";
  if (/REVIEW|PENDING|SUBMIT/.test(value)) return "IN_REVIEW";
  if (/PUBLISH|LIVE/.test(value)) return "PUBLISHED";
  if (/DRAFT|UNSUBMITTED/.test(value)) return "DRAFT";
  return null;
}

/**
 * What the store currently says about one item.
 *
 * The two revisions answer different questions and both matter: the published
 * one is what users have, the submitted one is what is waiting. An item with a
 * submitted revision that is neither in review nor published is the silent case
 * — it is sitting in Draft, and someone thinks they shipped it.
 */
export async function fetchItemStatus(params: {
  publisherId: string;
  itemId: string;
  accessToken: string;
}): Promise<ItemStatus> {
  const url = `${API_BASE}/publishers/${encodeURIComponent(
    params.publisherId
  )}/items/${encodeURIComponent(params.itemId)}:fetchStatus`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Chrome Web Store said ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    publishedItemRevisionStatus?: RevisionStatus;
    submittedItemRevisionStatus?: RevisionStatus;
  };

  const published = data.publishedItemRevisionStatus;
  const submitted = data.submittedItemRevisionStatus;

  const detail =
    submitted?.reviewSummary ??
    submitted?.reviewComment ??
    published?.reviewSummary ??
    null;

  const submittedState =
    foldState(submitted?.reviewState) ??
    foldState(submitted?.state) ??
    foldState(submitted?.status);

  // A submitted revision decides the state — it is the one with news. Only when
  // nothing is pending does the published revision get to speak.
  if (submitted) {
    return {
      state: submittedState ?? "DRAFT",
      publishedVersion: published?.version ?? null,
      submittedVersion: submitted.version ?? null,
      detail,
    };
  }

  return {
    state: published ? "PUBLISHED" : "UNKNOWN",
    publishedVersion: published?.version ?? null,
    submittedVersion: null,
    detail,
  };
}
