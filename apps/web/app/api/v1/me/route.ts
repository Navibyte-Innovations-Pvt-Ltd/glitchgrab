export const dynamic = "force-dynamic";

// Used by GlitchRecord desktop app to validate its token and get user info
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  const plainToken = authHeader.replace("Bearer ", "");
  const tokenHash = hashToken(plainToken);

  const record = await prisma.glitchRecordToken.findUnique({
    where: { tokenHash },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json({ success: false, error: "Invalid or expired token" }, { status: 401, headers: CORS });
  }

  return NextResponse.json({ success: true, data: record.user }, { headers: CORS });
}
