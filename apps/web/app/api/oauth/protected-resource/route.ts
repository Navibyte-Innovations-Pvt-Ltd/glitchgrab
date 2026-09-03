export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { mcpResourceUri, publicOrigin } from "@/lib/mcp-oauth";

/**
 * RFC 9728 Protected Resource Metadata.
 *
 * Served at /.well-known/oauth-protected-resource (see the rewrites in
 * next.config.ts). This is the first thing a client fetches after our 401, and
 * it is what points it at the authorization server — without it, Claude Code
 * has nothing to negotiate against and the connection just fails.
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
  return NextResponse.json(
    {
      resource: mcpResourceUri(),
      authorization_servers: [publicOrigin()],
      bearer_methods_supported: ["header"],
      scopes_supported: ["mcp"],
      resource_documentation: `${publicOrigin()}/docs/mcp`,
    },
    { headers: { ...CORS, "Cache-Control": "public, max-age=3600" } }
  );
}
