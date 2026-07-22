import { createAppAuth } from "@octokit/auth-app";
import { createHmac } from "crypto";

const GITHUB_API = "https://api.github.com";
const USER_AGENT = "Glitchgrab/1.0";

function appAuth() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!appId || !privateKey) {
    throw new Error("GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY env vars are not set");
  }
  return createAppAuth({ appId, privateKey });
}

function appHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": USER_AGENT,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

const installationTokenCache = new Map<number, { token: string; expiresAt: number }>();

/**
 * Returns a bearer token scoped to one GitHub App installation. Cached in-memory
 * until 5 minutes before GitHub's 1hr expiry — never persisted, tokens are short-lived
 * by design.
 */
export async function getInstallationAccessToken(installationId: number): Promise<string> {
  const cached = installationTokenCache.get(installationId);
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.token;
  }

  const { token, expiresAt } = await appAuth()({
    type: "installation",
    installationId,
  });

  installationTokenCache.set(installationId, {
    token,
    expiresAt: new Date(expiresAt).getTime(),
  });

  return token;
}

interface InstallationMeta {
  accountLogin: string;
  accountType: "User" | "Organization";
}

/**
 * Fetches installation metadata (which account it belongs to) using the App's own
 * JWT — used right after a user completes the GitHub App install flow.
 */
export async function fetchInstallationMeta(installationId: number): Promise<InstallationMeta | null> {
  const { token } = await appAuth()({ type: "app" });

  const res = await fetch(`${GITHUB_API}/app/installations/${installationId}`, {
    headers: appHeaders(token),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    account: { login: string; type: "User" | "Organization" } | null;
  };
  if (!data.account) return null;

  return { accountLogin: data.account.login, accountType: data.account.type };
}

/**
 * Link to install the GitHub App, carrying a signed `state` so the install
 * callback (app/api/v1/github/app/callback) can auto-link this user's repos.
 *
 * `targetGithubId` (a GitHub account/org numeric id) jumps straight to that
 * account's install flow — without it, GitHub defaults to the installing
 * user's personal account instead of showing an org picker, which is wrong
 * when we already know which org's repos need covering.
 */
export function buildGithubAppInstallUrl(userId: string, targetGithubId?: number): string {
  const secret = process.env.AUTH_SECRET ?? "";
  const payload = JSON.stringify({ userId, ts: Date.now() });
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  const state = Buffer.from(JSON.stringify({ payload, sig })).toString("base64url");

  const slug = process.env.GITHUB_APP_SLUG;
  const path = targetGithubId ? "installations/new/permissions" : "installations/new";
  const params = new URLSearchParams({ state });
  if (targetGithubId) params.set("target_id", String(targetGithubId));
  return `https://github.com/apps/${slug}/${path}?${params.toString()}`;
}
