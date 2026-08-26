import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { getOpenIssues, rankIssues } from "@/lib/ai-assist/issues";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * The repo's open issues, for a coding agent (#MCP).
 *
 * Same list the report assistant reads when it decides whether something is
 * already filed — here it answers the other half of the question: an agent
 * about to work on a bug can see what is already open before it starts, and
 * before it files anything of its own.
 *
 * Token auth, so the repo comes from the credential exactly like every other
 * SDK route. One token is one repo; there is no repo parameter to get wrong.
 *
 * Titles, numbers, URLs and update times only — never bodies. A body carries
 * whatever a stranger typed into a report plus its screenshots, and an agent
 * asking "what is open" does not need a hundred thousand tokens of it.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const tokenHash = hashToken(authHeader.replace("Bearer ", ""));
    const apiToken = await prisma.apiToken.findUnique({
      where: { tokenHash },
      select: { id: true, repoId: true },
    });
    if (!apiToken) {
      return NextResponse.json(
        { success: false, error: "Invalid API token" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const limit = await checkRateLimit(`issues:${tokenHash}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded" },
        { status: 429, headers: CORS_HEADERS }
      );
    }

    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";
    const max = Math.min(Number(url.searchParams.get("limit") ?? 30) || 30, 100);

    const issues = await getOpenIssues(apiToken.repoId);
    // `q` ranks rather than filters: an agent searching "save button" still
    // wants to see the list if nothing matches, not an empty answer that reads
    // as "nothing is open".
    const ranked = query ? rankIssues(issues, query, max) : issues.slice(0, max);

    return NextResponse.json(
      { success: true, data: { issues: ranked, total: issues.length } },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("SDK issues error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
