export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encrypt";

interface Selection {
  siteUrl: string;
  repoId: string;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { sessionId: string; selections: Selection[] };
  const { sessionId, selections } = body;

  if (!sessionId || !selections?.length) {
    return NextResponse.json({ success: false, error: "sessionId and selections required" }, { status: 400 });
  }

  const connectSession = await prisma.gscConnectSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  });

  if (!connectSession) {
    return NextResponse.json({ success: false, error: "Session not found or expired" }, { status: 404 });
  }

  if (connectSession.expiresAt < new Date()) {
    await prisma.gscConnectSession.delete({ where: { id: sessionId } });
    return NextResponse.json({ success: false, error: "Session expired — please reconnect GSC" }, { status: 410 });
  }

  const availableSiteUrls = (connectSession.sites as Array<{ siteUrl: string }>).map((s) => s.siteUrl);

  // Validate all selected siteUrls are from this session
  for (const sel of selections) {
    if (!availableSiteUrls.includes(sel.siteUrl)) {
      return NextResponse.json({ success: false, error: `Invalid siteUrl: ${sel.siteUrl}` }, { status: 400 });
    }
    if (!sel.repoId) {
      return NextResponse.json({ success: false, error: `Repo required for ${sel.siteUrl}` }, { status: 400 });
    }
  }

  const accessToken = decrypt(connectSession.encryptedAccess);
  const refreshToken = connectSession.encryptedRefresh ? decrypt(connectSession.encryptedRefresh) : null;

  for (const { siteUrl, repoId } of selections) {
    await prisma.gscProperty.upsert({
      where: { userId_siteUrl: { userId: session.user.id, siteUrl } },
      create: {
        userId: session.user.id,
        siteUrl,
        repoId,
        encryptedAccessToken: connectSession.encryptedAccess,
        encryptedRefreshToken: connectSession.encryptedRefresh ?? null,
        tokenExpiresAt: connectSession.tokenExpiresAt,
      },
      update: {
        repoId,
        encryptedAccessToken: connectSession.encryptedAccess,
        ...(connectSession.encryptedRefresh ? { encryptedRefreshToken: connectSession.encryptedRefresh } : {}),
        tokenExpiresAt: connectSession.tokenExpiresAt,
      },
    });
  }

  // Clean up session
  await prisma.gscConnectSession.delete({ where: { id: sessionId } });

  // Suppress unused variable warnings
  void accessToken;
  void refreshToken;

  return NextResponse.json({ success: true, data: { connected: selections.length } });
}
