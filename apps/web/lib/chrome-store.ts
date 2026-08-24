import { createSign } from "crypto";

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
 * Auth is a **service account**, not an OAuth refresh token. Google issues
 * refresh tokens on a testing-mode client that die after 7 days, which is why
 * the older setup needed a cron purely to rotate a secret. A service account
 * added as a user on the publisher account does not expire.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://chromewebstore.googleapis.com/v2";
const SCOPE = "https://www.googleapis.com/auth/chromewebstore";

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

/** Coarse on purpose — see the enum comment in schema.prisma. */
type ReviewState = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "NEEDS_ATTENTION" | "UNKNOWN";

interface ItemStatus {
  state: ReviewState;
  publishedVersion: string | null;
  submittedVersion: string | null;
  /** Whatever the store said, kept verbatim for the message a human reads. */
  detail: string | null;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Parse the JSON a service-account key file contains.
 *
 * Thrown errors here are a misconfiguration, never a transient failure, so the
 * caller can record them on the row instead of retrying forever.
 */
export function parseServiceAccount(json: string): ServiceAccountKey {
  const parsed = JSON.parse(json) as Partial<ServiceAccountKey>;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("Service account JSON is missing client_email or private_key");
  }
  return { client_email: parsed.client_email, private_key: parsed.private_key };
}

/**
 * Exchange the service-account key for an access token (JWT bearer flow).
 *
 * Done by hand rather than pulling in googleapis: this is one signature and one
 * POST, and the SDK is 40 MB of surface for it.
 */
export async function getStoreAccessToken(key: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: key.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  // Key files carry literal \n when they have been through an env var.
  const assertion = `${header}.${claims}.${base64url(
    signer.sign(key.private_key.replace(/\\n/g, "\n"))
  )}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Google refused the service account (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Google returned no access token");
  return data.access_token;
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
