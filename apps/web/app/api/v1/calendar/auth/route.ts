export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildCalendarAuthUrl, CALENDAR_STATE_COOKIE } from "@/lib/calendar";

/**
 * GET /api/v1/calendar/auth — begin connecting a Google Calendar.
 *
 * Read-only scopes: we look at when your meetings are and whether they carry a
 * Meet link. We never create, move or delete anything in anyone's calendar.
 *
 * The random nonce set here is what ties the OAuth state to THIS browser, so a
 * state minted by an attacker cannot be completed in someone else's session.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { success: false, error: "Google OAuth is not configured" },
      { status: 503 }
    );
  }

  const { url, nonce } = buildCalendarAuthUrl(session.user.id);
  const response = NextResponse.redirect(url);

  response.cookies.set(CALENDAR_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax, not Strict: the cookie has to survive Google redirecting back to us.
    sameSite: "lax",
    path: "/",
    // Matches the state's own freshness window.
    maxAge: 15 * 60,
  });

  return response;
}
