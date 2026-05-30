export const dynamic = "force-dynamic";

// GlitchRecord desktop app auth flow:
// 1. GlitchRecord opens: /api/auth/glitchrecord?redirect=glitchrecord://auth
// 2. User must be logged in (session cookie) — if not, redirect to sign-in
// 3. Generate a GlitchRecordToken and redirect back to the app via deep link

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/tokens";

const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    const callbackUrl = encodeURIComponent(request.url);
    return NextResponse.redirect(
      new URL(`/api/auth/signin?callbackUrl=${callbackUrl}`, request.url)
    );
  }

  const url = new URL(request.url);
  const redirect = url.searchParams.get("redirect") ?? "glitchrecord://auth";

  const plainToken = generateToken();
  const tokenHash = hashToken(plainToken);

  await prisma.glitchRecordToken.create({
    data: {
      userId: session.user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const callbackUrl = `${redirect}?token=${plainToken}&userId=${session.user.id}`;
  return NextResponse.redirect(callbackUrl);
}
