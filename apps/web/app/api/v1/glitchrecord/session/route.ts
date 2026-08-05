export const dynamic = "force-dynamic";

// Mints an ExtensionSession for the GlitchRecord desktop app's own logged-in
// user, so the desktop "Report Bug" window can use the exact same identity +
// repo-scoping + report endpoints as the Chrome extension
// (/api/v1/extension/repos, /api/v1/extension/report) instead of a parallel
// desktop-only pipeline. One path to debug, not two.
//
// This is the OWNER path — the desktop app is signed in with a
// GlitchRecordToken. A QA tester instead opens their magic link in whatever
// browser they use and hands the sessionId to the app over the
// glitchrecord://tester-auth deep link (see app/qa/qa-client.tsx), which is
// why the desktop app works for testers on Firefox/Safari where the
// Chrome-only extension can't.
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
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401, headers: CORS }
    );
  }

  const record = await prisma.glitchRecordToken.findUnique({
    where: { tokenHash: hashToken(authHeader.replace("Bearer ", "")) },
    select: {
      expiresAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json(
      { success: false, error: "Invalid or expired token" },
      { status: 401, headers: CORS }
    );
  }

  // repoId stays null — the picker in the report window resolves the allowed
  // set from this session, and a recording backfills it later (see
  // glitchbridge/server.ts broadcastRecordingStart).
  const created = await prisma.extensionSession.create({
    data: {
      tokenId: null,
      repoId: null,
      userId: record.user.id,
      testerName: record.user.name ?? record.user.email ?? "Glitchgrab user",
      testerEmail: record.user.email ?? null,
    },
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        sessionId: created.id,
        testerName: created.testerName,
        testerEmail: created.testerEmail,
      },
    },
    { headers: CORS }
  );
}
