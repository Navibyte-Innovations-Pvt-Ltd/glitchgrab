export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/mcp-oauth";

/**
 * RFC 8414 Authorization Server Metadata.
 *
 * Served at /.well-known/oauth-authorization-server. Advertises only what this
 * server actually does: authorization_code + refresh_token, PKCE S256, public
 * clients, dynamic registration.
 */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  const origin = publicOrigin();

  return NextResponse.json(
    {
      issuer: origin,
      authorization_endpoint: `${origin}/oauth/authorize`,
      token_endpoint: `${origin}/api/oauth/token`,
      registration_endpoint: `${origin}/api/oauth/register`,
      scopes_supported: ["mcp"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      // S256 only. `plain` would make the verifier equal the challenge, which
      // defeats the point of PKCE for a public client.
      code_challenge_methods_supported: ["S256"],
      // Public clients: an agent on a laptop cannot hold a secret, so PKCE is
      // the proof rather than client authentication.
      token_endpoint_auth_methods_supported: ["none"],
      service_documentation: `${origin}/docs/mcp`,
    },
    { headers: { ...CORS, "Cache-Control": "public, max-age=3600" } }
  );
}
