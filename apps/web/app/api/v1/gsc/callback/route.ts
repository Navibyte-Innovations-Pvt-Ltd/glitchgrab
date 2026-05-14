export const dynamic = "force-dynamic";

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encrypt";
import { exchangeGscCode, listGscSites } from "@/lib/gsc";

const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

function verifyState(stateParam: string): string | null {
  try {
    const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString("utf8")) as {
      payload: string;
      sig: string;
    };

    const secret = process.env.AUTH_SECRET ?? "";
    const expected = createHmac("sha256", secret).update(decoded.payload).digest("hex");

    // Timing-safe comparison
    if (!timingSafeEqual(Buffer.from(decoded.sig, "hex"), Buffer.from(expected, "hex"))) {
      return null;
    }

    const { userId, ts } = JSON.parse(decoded.payload) as { userId: string; ts: number };

    // Reject if state older than 10 minutes
    if (Date.now() - ts > STATE_MAX_AGE_MS) return null;

    return userId;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (!code || !stateParam) {
    return NextResponse.redirect(`${appUrl}/dashboard/seo?error=missing_params`);
  }

  const userId = verifyState(stateParam);
  if (!userId) {
    return NextResponse.redirect(`${appUrl}/dashboard/seo?error=invalid_state`);
  }

  try {
    const redirectUri = `${appUrl}/api/v1/gsc/callback`;
    const tokens = await exchangeGscCode(code, redirectUri);

    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const sites = await listGscSites(accessToken);

    if (sites.length === 0) {
      return NextResponse.redirect(`${appUrl}/dashboard/seo?error=no_properties`);
    }

    // Store tokens + sites temporarily — redirect user to pick properties + repos
    const session = await prisma.gscConnectSession.create({
      data: {
        userId,
        encryptedAccess: encrypt(accessToken),
        encryptedRefresh: refreshToken ? encrypt(refreshToken) : null,
        tokenExpiresAt,
        sites,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      },
    });

    return NextResponse.redirect(`${appUrl}/dashboard/seo/connect?session=${session.id}`);
  } catch (error) {
    console.error("GSC callback error:", error);
    return NextResponse.redirect(`${appUrl}/dashboard/seo?error=oauth_failed`);
  }
}
