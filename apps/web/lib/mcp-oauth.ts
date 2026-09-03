import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";

/**
 * OAuth 2.1 authorization server for the MCP endpoint at /api/mcp.
 *
 * Why this exists at all: an MCP client carries no cookie, so the session auth
 * the dashboard uses is unreachable from an agent. A pasted API token works but
 * is config the user has to find, copy and keep in sync. This is the "click
 * connect, approve in the browser, done" path.
 *
 * Glitchgrab is both the resource server and the authorization server here.
 * NextAuth still decides *who the human is* — this layer never sees a password,
 * it just needs a signed-in session at the consent step.
 */

/** The canonical resource identifier, RFC 8707. No trailing slash, no fragment. */
export function mcpResourceUri(): string {
  return `${publicOrigin()}/api/mcp`;
}

export function publicOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    "https://glitchgrab.dev";
  return raw.replace(/\/+$/, "");
}

/**
 * Tokens are compared by hash, never stored in plaintext — same posture as
 * `ApiToken`. The DB is not a place a bearer credential belongs.
 */
function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function randomSecret(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Accepts a `resource` that names this MCP server.
 *
 * Deliberately lenient about a trailing slash and about the bare origin: the
 * spec tells clients to send the most specific URI they can, and real clients
 * disagree on whether that includes the path. Anything pointing at another host
 * is rejected — that is the audience check that stops a token minted for
 * someone else's server being replayed here.
 */
export function isAcceptableResource(resource: string | null | undefined): boolean {
  if (!resource) return false;
  const normalized = resource.replace(/\/+$/, "").toLowerCase();
  const origin = publicOrigin().toLowerCase();
  return normalized === `${origin}/api/mcp` || normalized === origin;
}

// ─── PKCE ────────────────────────────────────────────────────────

/**
 * S256 only. `plain` is still legal in some OAuth profiles and is worthless
 * here: it makes the verifier equal to the challenge, so anyone who intercepts
 * the authorization request can redeem the code.
 */
export function verifyPkce(verifier: string, challenge: string, method: string): boolean {
  if (method !== "S256") return false;
  if (verifier.length < 43 || verifier.length > 128) return false;

  const computed = createHash("sha256").update(verifier).digest("base64url");
  const a = Buffer.from(computed);
  const b = Buffer.from(challenge);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ─── Dynamic client registration (RFC 7591) ──────────────────────

/**
 * Every redirect URI must be HTTPS or loopback. An `http://` redirect to any
 * other host would hand the authorization code to the network.
 */
export function isAllowedRedirectUri(uri: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return false;
  }
  if (parsed.hash) return false;
  if (parsed.protocol === "https:") return true;
  if (parsed.protocol === "http:") {
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
  }
  // Custom schemes (claude://, vscode://) are how desktop clients come back.
  return /^[a-z][a-z0-9+.-]*:$/.test(parsed.protocol) && parsed.protocol !== "javascript:";
}

export async function registerClient(input: {
  clientName?: string;
  redirectUris: string[];
}): Promise<{ clientId: string; clientName: string | null; redirectUris: string[] }> {
  const redirectUris = input.redirectUris.filter(isAllowedRedirectUri);
  if (redirectUris.length === 0) throw new Error("no valid redirect_uris");

  const client = await prisma.oAuthClient.create({
    data: {
      clientId: `ggc_${randomSecret(18)}`,
      clientName: input.clientName?.slice(0, 120) || null,
      redirectUris,
    },
    select: { clientId: true, clientName: true, redirectUris: true },
  });
  return client;
}

// ─── Authorization codes ─────────────────────────────────────────

const AUTH_CODE_TTL_MS = 60_000;

export async function issueAuthorizationCode(input: {
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  resource: string;
  scope: string;
}): Promise<string> {
  const code = randomSecret(32);
  await prisma.oAuthAuthCode.create({
    data: {
      codeHash: hashSecret(code),
      clientId: input.clientId,
      userId: input.userId,
      redirectUri: input.redirectUri,
      codeChallenge: input.codeChallenge,
      codeChallengeMethod: input.codeChallengeMethod,
      resource: input.resource,
      scope: input.scope,
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
    },
  });
  return code;
}

/**
 * Redeems a code exactly once.
 *
 * The claim is an `updateMany` scoped to `usedAt: null`, then a count check —
 * read-then-write would let two simultaneous redemptions both pass the check.
 * Same pattern the magic-link provider uses, for the same reason.
 */
export async function claimAuthorizationCode(code: string) {
  const codeHash = hashSecret(code);
  const claimed = await prisma.oAuthAuthCode.updateMany({
    where: { codeHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return null;
  return prisma.oAuthAuthCode.findUnique({ where: { codeHash } });
}

// ─── Access + refresh tokens ─────────────────────────────────────

const ACCESS_TTL_MS = 60 * 60 * 1000; // 1h — short, per OAuth 2.1 guidance
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30d

interface IssuedTokens {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
}

export async function issueTokens(input: {
  clientId: string;
  userId: string;
  resource: string;
  scope: string;
}): Promise<IssuedTokens> {
  const accessToken = randomSecret(32);
  const refreshToken = randomSecret(32);
  const now = Date.now();

  await prisma.oAuthToken.create({
    data: {
      accessTokenHash: hashSecret(accessToken),
      refreshTokenHash: hashSecret(refreshToken),
      clientId: input.clientId,
      userId: input.userId,
      resource: input.resource,
      scope: input.scope,
      expiresAt: new Date(now + ACCESS_TTL_MS),
      refreshExpiresAt: new Date(now + REFRESH_TTL_MS),
    },
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: Math.floor(ACCESS_TTL_MS / 1000),
    scope: input.scope,
  };
}

/**
 * Rotates a refresh token: the presented one is revoked and a fresh pair
 * issued. OAuth 2.1 requires rotation for public clients — without it a leaked
 * refresh token is a permanent credential, and reuse is undetectable.
 */
export async function rotateRefreshToken(
  refreshToken: string,
  clientId: string
): Promise<IssuedTokens | null> {
  const refreshTokenHash = hashSecret(refreshToken);

  const revoked = await prisma.oAuthToken.updateMany({
    where: {
      refreshTokenHash,
      clientId,
      revokedAt: null,
      refreshExpiresAt: { gt: new Date() },
    },
    data: { revokedAt: new Date() },
  });
  if (revoked.count !== 1) return null;

  const previous = await prisma.oAuthToken.findUnique({
    where: { refreshTokenHash },
    select: { userId: true, resource: true, scope: true },
  });
  if (!previous) return null;

  return issueTokens({
    clientId,
    userId: previous.userId,
    resource: previous.resource,
    scope: previous.scope,
  });
}

/**
 * Validates a bearer access token for an MCP call.
 *
 * Audience is checked, not just expiry: a token minted for a different resource
 * must not work here even if this server issued it. That is the mitigation for
 * the token-passthrough / confused-deputy problem the MCP spec calls out.
 */
export async function verifyAccessToken(
  token: string
): Promise<{ userId: string; scope: string } | null> {
  const accessTokenHash = hashSecret(token);
  const row = await prisma.oAuthToken.findUnique({
    where: { accessTokenHash },
    select: { userId: true, scope: true, resource: true, expiresAt: true, revokedAt: true },
  });
  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt <= new Date()) return null;
  if (!isAcceptableResource(row.resource)) return null;

  void prisma.oAuthToken
    .update({ where: { accessTokenHash }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { userId: row.userId, scope: row.scope };
}


// ─── Repo visibility ─────────────────────────────────────────────

/**
 * Which repos an MCP caller may act on.
 *
 * Mirrors what the dashboard already shows (see `get-org-context.ts`): repos
 * you own, repos explicitly shared with you via `RepoMember`, and — if you own
 * the org — every repo under it. Matching on `userId` alone rejected repos the
 * user can plainly see in the UI, which read as "not connected to Glitchgrab"
 * for a repo sitting right there on their dashboard.
 *
 * The dashboard's other branch (fetching a non-owner member's repos live from
 * GitHub) is a listing convenience, not an authorization rule, so it is
 * deliberately not reproduced here.
 */
export function visibleRepoWhere(userId: string) {
  return {
    OR: [
      { userId },
      { members: { some: { userId } } },
      { org: { members: { some: { userId, role: "OWNER" as const } } } },
    ],
  };
}
