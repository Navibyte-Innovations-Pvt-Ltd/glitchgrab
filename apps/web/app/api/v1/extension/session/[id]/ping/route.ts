export const dynamic = "force-dynamic";

// Heartbeat from the extension background worker while a tester stays logged
// in — keeps ExtensionSession.lastPingAt fresh so "work time" reflects active
// use, not just login time.
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
  if (!authHeader?.startsWith("Bearer gg_")) {
    return NextResponse.json(
      { success: false, error: "Invalid or missing API token" },
      { status: 401, headers: CORS }
    );
  }

  const tokenHash = hashToken(authHeader.replace("Bearer ", ""));
  const apiToken = await prisma.apiToken.findUnique({ where: { tokenHash } });
  if (!apiToken) {
    return NextResponse.json(
      { success: false, error: "Invalid API token" },
      { status: 401, headers: CORS }
    );
  }

  const result = await prisma.extensionSession.updateMany({
    where: { id, tokenId: apiToken.id, endedAt: null },
    data: { lastPingAt: new Date() },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { success: false, error: "Session not found or already ended" },
      { status: 404, headers: CORS }
    );
  }

  return NextResponse.json({ success: true }, { headers: CORS });
}
