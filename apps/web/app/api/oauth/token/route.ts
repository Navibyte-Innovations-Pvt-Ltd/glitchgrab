export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  claimAuthorizationCode,
  isAcceptableResource,
  issueTokens,
  rotateRefreshToken,
  verifyPkce,
} from "@/lib/mcp-oauth";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function fail(error: string, description: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status, headers: CORS });
}

/**
 * Token endpoint: authorization_code and refresh_token.
 *
 * Accepts form-encoded (what OAuth specifies) and JSON, because MCP clients in
 * the wild send both.
 */
export async function POST(request: NextRequest) {
  let params: URLSearchParams;
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const json = (await request.json()) as Record<string, unknown>;
      params = new URLSearchParams(
        Object.entries(json).map(([k, v]) => [k, typeof v === "string" ? v : String(v)])
      );
    } else {
      params = new URLSearchParams(await request.text());
    }
  } catch {
    return fail("invalid_request", "could not parse request body");
  }

  const grantType = params.get("grant_type");
  const clientId = params.get("client_id");
  if (!clientId) return fail("invalid_client", "client_id is required");

  const client = await prisma.oAuthClient.findUnique({
    where: { clientId },
    select: { redirectUris: true },
  });
  if (!client) return fail("invalid_client", "unknown client_id", 401);

  // ─── refresh_token ───────────────────────────────────────────
  if (grantType === "refresh_token") {
    const refreshToken = params.get("refresh_token");
    if (!refreshToken) return fail("invalid_request", "refresh_token is required");

    const tokens = await rotateRefreshToken(refreshToken, clientId);
    if (!tokens) {
      return fail("invalid_grant", "refresh token is expired, revoked, or already used");
    }
    return NextResponse.json(tokens, { headers: CORS });
  }

  // ─── authorization_code ──────────────────────────────────────
  if (grantType !== "authorization_code") {
    return fail("unsupported_grant_type", `grant_type "${grantType}" is not supported`);
  }

  const code = params.get("code");
  const codeVerifier = params.get("code_verifier");
  const redirectUri = params.get("redirect_uri");

  if (!code) return fail("invalid_request", "code is required");
  if (!codeVerifier) return fail("invalid_request", "code_verifier is required");

  const claimed = await claimAuthorizationCode(code);
  if (!claimed) return fail("invalid_grant", "code is invalid, expired, or already used");

  // Every one of these binds the code to the exact request that created it.
  if (claimed.clientId !== clientId) {
    return fail("invalid_grant", "code was issued to a different client");
  }
  if (redirectUri && redirectUri !== claimed.redirectUri) {
    return fail("invalid_grant", "redirect_uri does not match the authorization request");
  }
  if (!verifyPkce(codeVerifier, claimed.codeChallenge, claimed.codeChallengeMethod)) {
    return fail("invalid_grant", "PKCE verification failed");
  }

  // The client may restate `resource` at the token endpoint; if it does, it has
  // to be the same audience it asked for at /authorize.
  const requestedResource = params.get("resource");
  if (requestedResource && !isAcceptableResource(requestedResource)) {
    return fail("invalid_target", "resource does not identify this MCP server");
  }

  const tokens = await issueTokens({
    clientId,
    userId: claimed.userId,
    resource: claimed.resource,
    scope: claimed.scope,
  });

  return NextResponse.json(tokens, { headers: CORS });
}
