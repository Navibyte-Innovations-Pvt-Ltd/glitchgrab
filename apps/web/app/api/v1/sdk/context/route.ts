import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { getGlitchBrief } from "@/lib/ai-assist/glitch-md";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * The project's brief, for a coding agent (#MCP).
 *
 * Serves the same GLITCH.md the report assistant reads, plus the notes the team
 * has accumulated in the dashboard. The point is that both sides work from one
 * brief: the assistant writing the report and the agent reading it should agree
 * on what the areas are called and who the roles are, or every report needs
 * translating on arrival.
 *
 * Token auth — one token, one repo, repo from the credential.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const NOTE_LIMIT = 25;

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
      select: { repoId: true, repo: { select: { fullName: true } } },
    });
    if (!apiToken) {
      return NextResponse.json(
        { success: false, error: "Invalid API token" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const limit = await checkRateLimit(`context:${tokenHash}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded" },
        { status: 429, headers: CORS_HEADERS }
      );
    }

    const [brief, notes] = await Promise.all([
      getGlitchBrief(apiToken.repoId),
      prisma.projectContextItem.findMany({
        where: { repoId: apiToken.repoId },
        select: { text: true },
        orderBy: { occurredAt: "desc" },
        take: NOTE_LIMIT,
      }),
    ]);

    const fullName = apiToken.repo.fullName;
    return NextResponse.json(
      {
        success: true,
        data: {
          // Repo NAME only, matching /api/v1/sdk/project: the org someone hosts
          // their code under is not something a token holder is owed.
          project: fullName.includes("/") ? fullName.split("/")[1] : fullName,
          hasBrief: brief !== null,
          brief,
          notes: notes.map((n) => n.text),
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("SDK context error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
