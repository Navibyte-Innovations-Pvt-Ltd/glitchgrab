export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encrypt";
import {
  CALENDAR_STATE_COOKIE,
  exchangeCalendarCode,
  fetchGoogleEmail,
  parseCalendarState,
  syncCalendar,
} from "@/lib/calendar";

/**
 * GET /api/v1/calendar/callback — Google's OAuth redirect lands here.
 *
 * The `state` parameter is HMAC-signed and carries the user it was minted for,
 * so the connection is attached to that user rather than to whoever happens to
 * be holding a session in this browser.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "";

  const fail = (reason: string) =>
    NextResponse.redirect(`${appUrl}/dashboard?calendar=error&reason=${encodeURIComponent(reason)}`);

  const error = url.searchParams.get("error");
  if (error) return fail(error);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return fail("missing_code");

  // The nonce cookie proves this browser is the one that started the flow. A
  // signed state alone only proves we minted it — an attacker could mint one
  // for their own account and have the victim complete it, storing the
  // victim's Google tokens under the attacker's user.
  const jar = await cookies();
  const parsed = parseCalendarState(state, jar.get(CALENDAR_STATE_COOKIE)?.value);
  if (!parsed) return fail("bad_state");

  // Belt and braces: the signed-in user must BE the user the state was minted
  // for. A mismatch is either CSRF or a session swap mid-flow.
  const session = await auth();
  if (!session?.user?.id || session.user.id !== parsed.userId) {
    return fail("session_mismatch");
  }

  try {
    const tokens = await exchangeCalendarCode(code);
    const email = await fetchGoogleEmail(tokens.access_token);

    const connection = await prisma.calendarConnection.upsert({
      where: {
        userId_googleEmail: { userId: parsed.userId, googleEmail: email || "unknown" },
      },
      create: {
        userId: parsed.userId,
        googleEmail: email || "unknown",
        encryptedAccessToken: encrypt(tokens.access_token),
        encryptedRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      update: {
        encryptedAccessToken: encrypt(tokens.access_token),
        // Google only returns a refresh token on the FIRST consent, so a
        // reconnect that omits it must keep the one already stored — clearing
        // it would leave a connection that dies in an hour.
        ...(tokens.refresh_token ? { encryptedRefreshToken: encrypt(tokens.refresh_token) } : {}),
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      select: { id: true },
    });

    // Populate the list immediately — an empty screen after connecting reads as
    // a broken integration.
    await syncCalendar(connection.id).catch(() => {});

    const done = NextResponse.redirect(`${appUrl}/dashboard?calendar=connected`);
    // Single-use: the nonce must not survive to authorise a second flow.
    done.cookies.delete(CALENDAR_STATE_COOKIE);
    return done;
  } catch (err) {
    console.error("Calendar callback error:", err);
    return fail("exchange_failed");
  }
}
