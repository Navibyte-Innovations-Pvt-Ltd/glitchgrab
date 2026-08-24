export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encrypt";
import {
  exchangeStoreCode,
  fetchConnectedEmail,
  parseStoreState,
  STORE_STATE_COOKIE,
} from "@/lib/chrome-store";

/**
 * GET /api/v1/extensions/callback — Google's redirect lands here (#332).
 *
 * The connection is attached to the user the signed state was minted for, not
 * to whoever holds a session in this browser.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "";

  // Back to where the button was pressed, with an outcome the page can show.
  const done = (query: string) => NextResponse.redirect(`${appUrl}/dashboard?${query}`);
  const fail = (reason: string) => done(`cws=error&reason=${encodeURIComponent(reason)}`);

  const error = url.searchParams.get("error");
  if (error) return fail(error);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return fail("missing_code");

  const jar = await cookies();
  const parsed = parseStoreState(state, jar.get(STORE_STATE_COOKIE)?.value);
  if (!parsed) return fail("bad_state");

  try {
    const tokens = await exchangeStoreCode(code);

    // No refresh token means only an hour of access, and the watcher would go
    // quiet tomorrow with nothing on screen to explain it. Google omits it when
    // the account has consented before, which `prompt=consent` prevents — so
    // this is a real failure, not a case to store optimistically.
    if (!tokens.refresh_token) return fail("no_refresh_token");

    const email = await fetchConnectedEmail(tokens.access_token);

    await prisma.storeConnection.upsert({
      where: { userId_googleEmail: { userId: parsed.userId, googleEmail: email } },
      create: {
        userId: parsed.userId,
        googleEmail: email,
        refreshToken: encrypt(tokens.refresh_token),
      },
      // Reconnecting is how a dead connection gets fixed, so the new token
      // replaces the old one and the error goes with it.
      update: { refreshToken: encrypt(tokens.refresh_token), lastError: null },
    });

    const response = done(`cws=connected&account=${encodeURIComponent(email)}`);
    response.cookies.delete(STORE_STATE_COOKIE);
    return response;
  } catch (err) {
    console.error("[cws] connect failed:", err);
    return fail("exchange_failed");
  }
}
