export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/v1/sdk/project — which project does this token file bugs into?
 *
 * The report dialog shows it so the person filing knows where their report is
 * going. In the SDK that is fixed — one token, one repo — but it was invisible,
 * and "invisible" and "wrong" look identical to whoever is about to press send.
 *
 * Deliberately the repo NAME only, never the owner or the token: this renders
 * in a dialog any end user of the host app can open, and the org someone hosts
 * their code under is not theirs to see.
 *
 * Also carries `aiAssist` (#330) — whether the owner turned the report
 * assistant on for this project. The dialog uses it to decide whether to render
 * the AI tab at all; the flag is a UI hint, and /api/v1/ai/report-chat checks
 * the same column again on every call. A client that lies about it gets a 403.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const apiToken = await prisma.apiToken.findUnique({
      where: { tokenHash: hashToken(authHeader.replace("Bearer ", "")) },
      select: { repo: { select: { fullName: true, aiAssistEnabled: true } } },
    });
    if (!apiToken) {
      return NextResponse.json(
        { success: false, error: "Invalid API token" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const fullName = apiToken.repo.fullName;
    return NextResponse.json(
      {
        success: true,
        data: {
          name: fullName.includes("/") ? fullName.split("/")[1] : fullName,
          aiAssist: apiToken.repo.aiAssistEnabled,
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("SDK project error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
