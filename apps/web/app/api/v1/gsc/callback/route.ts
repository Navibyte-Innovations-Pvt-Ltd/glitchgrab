export const dynamic = "force-dynamic";

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { GSC_STATE_COOKIE } from "@/app/api/v1/gsc/auth/route";
import { encrypt } from "@/lib/encrypt";
import { exchangeGscCode, listGscSites } from "@/lib/gsc";

const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Verify the state parameter.
 *
 * Three things must hold: the signature is ours, the state is fresh, and the
 * nonce matches the cookie set when the flow began. The cookie is what proves
 * the browser completing the flow is the one that started it — a signature
 * alone only proves we minted the state, which an attacker can also obtain for
 * their OWN account and then have a victim complete.
 *
 * NOTE: unlike the calendar flow this does NOT additionally require an active
 * dashboard session. This flow deliberately supports a logged-out user (see the
 * GscConnectSession's 30-minute window, sized to let them log in and come
 * back), so a session check here would break the intended path. The nonce
 * binding closes the CSRF on its own.
 */
function verifyState(stateParam: string, cookieNonce: string | undefined): string | null {
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

    const { userId, nonce, ts } = JSON.parse(decoded.payload) as {
      userId: string;
      nonce?: string;
      ts: number;
    };

    // Reject if state older than 10 minutes
    if (Date.now() - ts > STATE_MAX_AGE_MS) return null;

    // No nonce means a state minted before this binding existed, or forged
    // without one — either way it is not usable.
    if (!nonce || !cookieNonce) return null;
    const a = Buffer.from(nonce);
    const b = Buffer.from(cookieNonce);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

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

  const jar = await cookies();
  const userId = verifyState(stateParam, jar.get(GSC_STATE_COOKIE)?.value);
  if (!userId) {
    return NextResponse.redirect(`${appUrl}/dashboard/seo?error=invalid_state`);
  }

  let step = "token_exchange";
  try {
    const redirectUri = `${appUrl}/api/v1/gsc/callback`;
    const tokens = await exchangeGscCode(code, redirectUri);

    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    step = "list_sites";
    const sites = await listGscSites(accessToken);

    if (sites.length === 0) {
      return NextResponse.redirect(`${appUrl}/dashboard/seo?error=no_properties`);
    }

    step = "save_session";
    // Store tokens + sites temporarily — redirect user to pick properties + repos
    const session = await prisma.gscConnectSession.create({
      data: {
        userId,
        encryptedAccess: encrypt(accessToken),
        encryptedRefresh: refreshToken ? encrypt(refreshToken) : null,
        tokenExpiresAt,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sites: sites as any,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min — enough to log in and return
      },
    });

    const done = NextResponse.redirect(`${appUrl}/connect/gsc?session=${session.id}`);
    // Single-use: the nonce must not survive to authorise a second flow.
    done.cookies.delete(GSC_STATE_COOKIE);
    return done;
  } catch (error) {
    console.error(`GSC callback error at step=${step}:`, error);
    return NextResponse.redirect(`${appUrl}/dashboard/seo?error=${step}_failed`);
  }
}
