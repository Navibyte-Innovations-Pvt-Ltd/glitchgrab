export const dynamic = "force-dynamic";

// Tester logs out of the extension (or the popup detects an idle timeout) —
// closes the ExtensionSession so its duration stops accruing.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authHeader = request.headers.get("authorization");

  // Manual popup login (gg_ token) vs QA-magic-link auto-login (tokenless) —
  // see ping/route.ts for the same split.
  let where: { id: string; endedAt: null; tokenId: string | null };
  if (authHeader?.startsWith("Bearer gg_")) {
    const tokenHash = hashToken(authHeader.replace("Bearer ", ""));
    const apiToken = await prisma.apiToken.findUnique({ where: { tokenHash } });
    if (!apiToken) {
      return NextResponse.json(
        { success: false, error: "Invalid API token" },
        { status: 401, headers: CORS }
      );
    }
    where = { id, tokenId: apiToken.id, endedAt: null };
  } else {
    where = { id, tokenId: null, endedAt: null };
  }

  const now = new Date();
  const result = await prisma.extensionSession.updateMany({
    where,
    data: { endedAt: now, lastPingAt: now },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { success: false, error: "Session not found or already ended" },
      { status: 404, headers: CORS }
    );
  }

  return NextResponse.json({ success: true }, { headers: CORS });
}
