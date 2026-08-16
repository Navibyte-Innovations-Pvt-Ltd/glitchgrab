export const dynamic = "force-dynamic";

import { createHmac, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

function signState(payload: string): string {
  const secret = process.env.AUTH_SECRET ?? "";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Cookie carrying the nonce that ties an OAuth state to THIS browser. */
export const GSC_STATE_COOKIE = "gg_gsc_oauth";

/**
 * Begin the Search Console connect flow.
 *
 * Returns the nonce alongside the URL — the caller MUST set it as an httpOnly
 * cookie. A signed state only proves we minted it, not that the browser
 * finishing the flow is the one that started it. Without that binding an
 * attacker can mint a state for their own account, send the victim the consent
 * link, and have the victim's Google tokens stored against the attacker's user
 * — handing them the victim's Search Console data and URL-indexing rights.
 */
export function buildGscAuthUrl(userId: string): { url: string; nonce: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const nonce = randomBytes(32).toString("base64url");
  const payload = JSON.stringify({ userId, nonce, ts: Date.now() });
  const sig = signState(payload);
  const state = Buffer.from(JSON.stringify({ payload, sig })).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl}/api/v1/gsc/callback`,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/indexing",
    ].join(" "),
    access_type: "offline",
    prompt: "select_account consent",
    state,
  });

  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, nonce };
}

/** Shared by both entry points so the cookie can never drift out of sync. */
export function setGscStateCookie(response: NextResponse, nonce: string): NextResponse {
  response.cookies.set(GSC_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax, not Strict: the cookie has to survive Google redirecting back to us.
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });
  return response;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!clientId || !appUrl) {
    return NextResponse.json(
      { success: false, error: "Google OAuth not configured" },
      { status: 500 }
    );
  }

  const { url, nonce } = buildGscAuthUrl(session.user.id);
  return setGscStateCookie(NextResponse.redirect(url), nonce);
}
