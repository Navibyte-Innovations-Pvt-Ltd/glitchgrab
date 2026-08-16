import { readFile, writeFile } from "node:fs/promises";

/**
 * Google session for the bot (#311).
 *
 * Meet refuses anonymous participants on Workspace-hosted meetings outright —
 * not "ask to join", a hard "You can't join this video call". So the bot has to
 * BE somebody: a real Google account, ideally a user inside your own Workspace
 * (e.g. notetaker@yourdomain.com), which makes it an org member rather than a
 * stranger and keeps you from having to loosen access for every meeting.
 *
 * Logging into Google from Playwright on every run is the single most fragile
 * thing this service could do — it is exactly what bot-detection is built to
 * catch. So we never do it. The session is seeded ONCE from a real browser
 * (`bun run seed-auth`) and replayed here.
 */

/** Base64-encoded Playwright storageState JSON. Set on the Railway service. */
const ENV_KEY = "GOOGLE_STORAGE_STATE";

/**
 * Optional path on a mounted volume. Preferred when available: Google rotates
 * cookies as you use them, and writing the refreshed state back means the
 * session ages far better than a frozen env var.
 */
const PATH_KEY = "GOOGLE_STATE_PATH";

/** Shape Playwright expects — kept loose on purpose, we only pass it through. */
export type StorageState = Record<string, unknown>;

/**
 * The stored Google session, or null when none is configured.
 *
 * Null is a supported state: the bot still tries to join anonymously, which
 * works for personal/consumer meetings and for orgs that allow guests. It just
 * fails on the common Workspace default — hence the explicit log.
 */
export async function loadGoogleSession(): Promise<StorageState | null> {
  const path = process.env[PATH_KEY];
  if (path) {
    try {
      const raw = await readFile(path, "utf8");
      const state = JSON.parse(raw) as StorageState;
      console.log(`[bot] Google session loaded from ${path}`);
      return state;
    } catch {
      // Fall through to the env var — a missing volume file on first boot is
      // normal, not a failure.
      console.warn(`[bot] no Google session at ${path}, trying ${ENV_KEY}`);
    }
  }

  const encoded = process.env[ENV_KEY];
  if (!encoded) {
    console.warn(
      `[bot] ${ENV_KEY} is not set — joining anonymously. Google Workspace meetings will refuse this.`
    );
    return null;
  }

  try {
    const state = JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as StorageState;
    console.log(`[bot] Google session loaded from ${ENV_KEY}`);
    return state;
  } catch (err) {
    console.error(`[bot] ${ENV_KEY} is not valid base64 JSON:`, err);
    return null;
  }
}

/**
 * Write the session back after a call.
 *
 * Google rotates its cookies as the session is used. Persisting the refreshed
 * state is what turns a session that dies in weeks into one that lasts —
 * only possible when a volume is mounted, since the env var is read-only.
 */
export async function saveGoogleSession(state: StorageState): Promise<void> {
  const path = process.env[PATH_KEY];
  if (!path) return;

  try {
    await writeFile(path, JSON.stringify(state), "utf8");
  } catch (err) {
    console.warn("[bot] could not persist refreshed Google session:", err);
  }
}

/**
 * True when the page is showing a Google sign-in wall rather than Meet.
 *
 * This is the signature of an expired session, and it must be reported as its
 * own failure — "could not find the join button" would send you hunting for a
 * selector bug when the real answer is "re-run seed-auth".
 */
export function isSignInWall(url: string, text: string): boolean {
  if (/accounts\.google\.com/.test(url)) return true;
  return /sign in to continue|choose an account|use your google account/i.test(text);
}
