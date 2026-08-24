export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildStoreAuthUrl, STORE_STATE_COOKIE } from "@/lib/chrome-store";

/**
 * POST /api/v1/extensions/connect — start connecting a Google account (#332).
 *
 * Returns the consent URL rather than redirecting: the button lives in a client
 * component, and a fetch that 302s to accounts.google.com just fails CORS.
 *
 * The nonce goes back as an httpOnly cookie and is checked in the callback. A
 * signed state alone only proves *we* minted it — it does not prove the browser
 * finishing consent is the one that started it, and without that an attacker
 * can mint a state for their own account, get someone else to complete it, and
 * walk away holding that person's store access.
 */
export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { url, nonce } = buildStoreAuthUrl(userId);

  const response = NextResponse.json({ success: true, data: { url } });
  response.cookies.set(STORE_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });

  return response;
}
