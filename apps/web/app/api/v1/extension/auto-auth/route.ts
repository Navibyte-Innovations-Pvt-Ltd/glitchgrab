export const dynamic = "force-dynamic";

// Silent extension login for the DASHBOARD user themselves (#297) — fires on
// every authenticated page (see components/extension-auto-login.tsx). Same
// postMessage handshake as the QA magic-link auto-login, just resolved from
// the NextAuth session instead of a Tester row. No repo known yet — that's
// backfilled once GlitchRecord actually starts recording (see
// glitchbridge/server.ts broadcastRecordingStart + PATCH .../[id]/repo).
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    return NextResponse.json({ success: false, error: "Not logged in" }, { status: 401 });
  }

  const created = await prisma.extensionSession.create({
    data: {
      tokenId: null,
      repoId: null,
      userId: user.id,
      testerName: user.name ?? user.email ?? "Glitchgrab user",
      testerEmail: user.email ?? null,
    },
  });

  return NextResponse.json({
    success: true,
    data: { sessionId: created.id, testerName: created.testerName, testerEmail: created.testerEmail },
  });
}
