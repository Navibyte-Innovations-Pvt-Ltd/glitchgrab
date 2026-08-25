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
  // Write, not readonly: releasing from CI means uploading and submitting, and
  // the read-only scope cannot do either. This is real power — it can push a
  // new version to every existing user of every extension on the account — so
  // it lives in one place we control rather than as copies of a key file in
  // every repo that ships an extension.
  "https://www.googleapis.com/auth/chromewebstore",
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

/**
 * The 32-character item id, from whatever the developer pasted.
 *
 * People copy the whole store URL, because that is what is in front of them —
 * and the id sits in the middle of it. Asking them to extract it by hand is
 * asking them to do a regex.
 */
export function parseItemId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-p]{32}$/.test(trimmed)) return trimmed;

  // Both the current host and the legacy one, with or without the name slug:
  //   chromewebstore.google.com/detail/<slug>/<id>
  //   chrome.google.com/webstore/detail/<slug>/<id>
  //   .../devconsole/detail/<id>
  const match = trimmed.match(/[/=]([a-p]{32})(?:[/?#]|$)/);
  return match?.[1] ?? null;
}

const STORE_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * Repair a Location header that arrived mis-encoded.
 *
 * `/detail/{id}` 301s to `/detail/{slug}/{id}`, and Google sends that slug
 * UTF-8-encoded twice while Node reads it as latin-1 once. An extension whose
 * name contains any non-ASCII character — an em-dash is enough — therefore
 * redirects to a URL that never matches, so undici loops until it gives up with
 * "redirect count exceeded". curl and Bun normalise it; Node does not, and Node
 * is what runs the route.
 *
 * Undo both encodings, then percent-encode the real bytes.
 */
function repairLocation(raw: string): string {
  // Pure ASCII: nothing to repair, and most listings land here.
  if (!/[^\x00-\x7F]/.test(raw)) return raw;

  // Anything above U+00FF means the header was decoded correctly (Bun does
  // this) — the character is real and only needs percent-encoding.
  const decodedProperly = [...raw].some((c) => c.charCodeAt(0) > 0xff);
  const bytes = decodedProperly
    ? Buffer.from(raw, "utf8")
    : // Everything in latin-1 range is the mojibake case (Node): the slug was
      // UTF-8-encoded twice and read back once, so undo both.
      Buffer.from(Buffer.from(raw, "latin1").toString("utf8"), "latin1");

  let out = "";
  for (const byte of bytes) {
    out += byte < 0x80 ? String.fromCharCode(byte) : `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
  }
  return out;
}

/** The only host this module is ever allowed to fetch. */
const STORE_HOST = "chromewebstore.google.com";

/**
 * Is this a Chrome Web Store listing URL, and nothing else?
 *
 * Exact host equality over a parsed URL, never a substring match on the raw
 * string: `https://evil.example/chromewebstore.google.com/detail/x/<32 chars>`
 * satisfies any unanchored pattern, and this function decides what the *server*
 * fetches. Getting it wrong turns a signed-in user into a request forwarder
 * with our egress — reachable from anywhere our network is, including link-local
 * metadata addresses.
 */
export function isStoreListingUrl(candidate: string): boolean {
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return false;
  }

  return (
    url.protocol === "https:" &&
    url.hostname === STORE_HOST &&
    // Anchored: the id must end the path, not merely appear inside it.
    /^\/detail\/[^/]+\/[a-p]{32}\/?$/.test(url.pathname)
  );
}

/**
 * Follow redirects ourselves, because Node cannot follow these ones.
 *
 * Every hop is re-checked against the same allowlist. `redirect: "manual"` only
 * hands us the Location header — it does not make following one safe, and an
 * open redirect on the store would otherwise walk us straight off it.
 */
async function fetchStorePage(url: string, hops = 4): Promise<Response | null> {
  let current = url;

  for (let i = 0; i < hops; i++) {
    const res = await fetch(current, {
      headers: { "User-Agent": STORE_UA, "Accept-Language": "en-US,en;q=0.9" },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    if (res.status < 300 || res.status >= 400) return res;

    const location = res.headers.get("location");
    if (!location) return res;

    const next = new URL(repairLocation(location), current).toString();
    // A redirect to where we already are is the loop, not a hop.
    if (next === current) return res;
    // Refuse to leave the store, whatever it asks.
    if (!isStoreListingUrl(next)) return null;
    current = next;
  }

  return null;
}

/**
 * The extension's name, read off its public store page.
 *
 * Deliberately not the API: `fetchStatus` returns versions and review state,
 * never a title. The public listing has one and needs no auth.
 *
 * Returns a *reason* alongside the name rather than a bare null. The two
 * silences are different — "this has never been published" is the case the
 * watcher exists for, while "the store would not talk to us" is a bug — and
 * collapsing them into null told people their live extension was a draft.
 *
 * `sourceUrl` is the link the developer actually pasted. When it already
 * carries the name slug it is requested as-is and no redirect happens at all,
 * which is both faster and immune to the encoding bug above.
 */
export async function fetchStoreListingName(
  itemId: string,
  sourceUrl?: string
): Promise<{ name: string | null; reason: "ok" | "no-listing" | "unreachable"; detail?: string }> {
  // The pasted link is only ever used when it is provably a store listing URL
  // for this very item. Anything else is discarded and the URL is rebuilt from
  // the validated id, which cannot point anywhere but the store.
  const stripped = sourceUrl?.split("?")[0] ?? "";
  const direct =
    stripped && isStoreListingUrl(stripped) && stripped.endsWith(itemId) ? stripped : null;

  let res: Response | null;
  try {
    res = await fetchStorePage(direct ?? `https://${STORE_HOST}/detail/${itemId}`);
  } catch (err) {
    const cause = (err as { cause?: { message?: string } })?.cause?.message;
    return {
      name: null,
      reason: "unreachable",
      detail: cause ?? (err instanceof Error ? err.message : "network error"),
    };
  }

  // Null means the redirect chain either looped or tried to leave the store.
  if (!res) return { name: null, reason: "unreachable", detail: "redirected off the store" };

  // 404 is the genuine "no public page" — anything else is the store refusing
  // us, which says nothing about whether the extension is published.
  if (res.status === 404) return { name: null, reason: "no-listing" };
  if (!res.ok) return { name: null, reason: "unreachable", detail: `store returned ${res.status}` };

  const html = await res.text();
  const title =
    html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ??
    html.match(/<title>([^<]+)<\/title>/)?.[1];

  // A 200 with no title at all is a bot check or a consent wall, not a listing.
  if (!title) {
    return { name: null, reason: "unreachable", detail: "no title on the page" };
  }

  // The page title carries the store's own suffix, which is not part of the
  // extension's name.
  const name = title.replace(/\s*[-–|]\s*Chrome Web Store\s*$/i, "").trim();

  // An id nobody has published still answers 200 — with the store's own
  // landing page, whose title is just "Chrome Web Store". Left alone that
  // becomes the extension's name, which is worse than no name at all.
  if (!name || /^chrome web store$/i.test(name)) return { name: null, reason: "no-listing" };

  return {
    name: name
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .slice(0, 120),
    reason: "ok",
  };
}

/** What a release attempt did, in the words the workflow log will show. */
export interface ReleaseOutcome {
  ok: boolean;
  error?: string;
}

/**
 * Upload a new package and submit it for review (#332).
 *
 * Two calls, both of which have to succeed: `upload` replaces the draft, and
 * `publish` is what actually sends it to Google. Uploading alone is the exact
 * silence this whole feature exists to end — a new version sitting in Draft
 * while everyone believes it shipped — so a failure to publish is reported as a
 * failed release, never as a partial success.
 */
export async function uploadAndPublish(params: {
  publisherId: string;
  itemId: string;
  accessToken: string;
  zip: ArrayBuffer;
}): Promise<ReleaseOutcome> {
  const base = `${API_BASE}/publishers/${encodeURIComponent(
    params.publisherId
  )}/items/${encodeURIComponent(params.itemId)}`;

  const upload = await fetch(`${base}:upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/zip",
    },
    body: params.zip,
  });

  if (!upload.ok) {
    return {
      ok: false,
      error: `Upload rejected (${upload.status}): ${(await upload.text()).slice(0, 300)}`,
    };
  }

  const publish = await fetch(`${base}:publish`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!publish.ok) {
    return {
      ok: false,
      // Named precisely: the upload DID happen, so the draft on the store is
      // now the new code. Saying "release failed" without that would send
      // someone hunting for a version that is already sitting there.
      error: `Uploaded, but submitting for review failed (${publish.status}): ${(
        await publish.text()
      ).slice(0, 300)}`,
    };
  }

  return { ok: true };
}

/**
 * The version this release should carry.
 *
 * Derived from what the **store** currently holds, not from a git tag: the tag
 * approach patches version numbers into files at build time without committing
 * them, so the repo and the store drift apart and nobody notices until a
 * release is rejected for a duplicate version.
 */
export function nextVersion(current: string | null, bump: "major" | "minor" | "patch"): string {
  const [major = 0, minor = 0, patch = 0] = (current ?? "0.0.0")
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);

  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}
