export const dynamic = "force-dynamic";

// Tester login in the Chrome extension popup — paste a gg_ token + type
// name/email once. Starts an ExtensionSession row; its duration is the
// "tester work time" shown in the dashboard audit log (#297).
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

export async function POST(request: Request) {
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

  const body = (await request.json().catch(() => ({}))) as {
    testerName?: string;
    testerEmail?: string;
  };
  if (!body.testerName?.trim()) {
    return NextResponse.json(
      { success: false, error: "testerName required" },
      { status: 400, headers: CORS }
    );
  }

  const session = await prisma.extensionSession.create({
    data: {
      tokenId: apiToken.id,
      repoId: apiToken.repoId,
      testerName: body.testerName.trim(),
      testerEmail: body.testerEmail?.trim() || null,
    },
  });

  return NextResponse.json(
    { success: true, data: { sessionId: session.id } },
    { headers: CORS }
  );
}
