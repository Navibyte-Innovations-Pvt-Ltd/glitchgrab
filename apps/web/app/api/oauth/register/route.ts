export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAllowedRedirectUri, registerClient } from "@/lib/mcp-oauth";

/**
 * RFC 7591 Dynamic Client Registration.
 *
 * Open registration on purpose: this is what lets a user click "connect" and
 * get a working client id with no dashboard visit. Registering a client grants
 * nothing on its own — a client id only becomes useful after a signed-in human
 * approves it on the consent screen, and every redirect URI is pinned at
 * registration and matched exactly afterwards.
 */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "body must be JSON" },
      { status: 400, headers: CORS }
    );
  }

  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u): u is string => typeof u === "string")
    : [];

  if (redirectUris.length === 0) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: "redirect_uris is required" },
      { status: 400, headers: CORS }
    );
  }

  // Validation failures are the client's problem and get a specific OAuth error;
  // anything else is ours and must not describe itself. This endpoint is
  // unauthenticated, so an unmasked exception hands a stranger the shape of the
  // database — the first version of this returned "table does not exist" to the
  // open internet, mislabelled as invalid_redirect_uri.
  if (!redirectUris.some(isAllowedRedirectUri)) {
    return NextResponse.json(
      {
        error: "invalid_redirect_uri",
        error_description:
          "redirect_uris must be https, a loopback address, or a custom app scheme",
      },
      { status: 400, headers: CORS }
    );
  }

  try {
    const client = await registerClient({
      clientName: typeof body.client_name === "string" ? body.client_name : undefined,
      redirectUris,
    });

    return NextResponse.json(
      {
        client_id: client.clientId,
        client_name: client.clientName,
        redirect_uris: client.redirectUris,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        // No secret is issued, so there is nothing to expire.
        client_id_issued_at: Math.floor(Date.now() / 1000),
      },
      { status: 201, headers: CORS }
    );
  } catch (error) {
    console.error("[oauth/register] failed:", error);
    return NextResponse.json(
      {
        error: "server_error",
        error_description: "Client registration is temporarily unavailable",
      },
      { status: 500, headers: CORS }
    );
  }
}
