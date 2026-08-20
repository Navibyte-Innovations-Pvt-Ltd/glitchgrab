export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildCalendarAuthUrl, CALENDAR_STATE_COOKIE } from "@/lib/calendar";

/**
 * GET /api/v1/calendar/auth — begin connecting a Google Calendar.
 *
 * Asks for read AND write, because demo booking creates the event and its Meet
 * link on this calendar. Nothing is ever moved or deleted; the only writes are
 * demos someone booked, and free/busy is read so offered slots reflect a real
 * day rather than a guess.
 *
 * The random nonce set here is what ties the OAuth state to THIS browser, so a
 * state minted by an attacker cannot be completed in someone else's session.
 */
export async function GET(request: Request) {
  // Two ways in. Normally the account holder connects their own calendar and
  // must be signed in. With an invite, the person connecting is a client with
  // their own Gmail and no Glitchgrab account at all — the invite itself is the
  // authorisation, and it can only ever add a calendar to one project.
  const inviteId = new URL(request.url).searchParams.get("invite");

  let userId: string | null = null;

  if (inviteId) {
    const invite = await prisma.calendarInvite.findUnique({
      where: { id: inviteId },
      select: { userId: true, usedAt: true, expiresAt: true },
    });
    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "That invite link has expired or was already used" },
        { status: 410 }
      );
    }
    userId = invite.userId;
  } else {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    userId = session.user.id;
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { success: false, error: "Google OAuth is not configured" },
      { status: 503 }
    );
  }

  const { url, nonce } = buildCalendarAuthUrl(userId, inviteId ?? undefined);
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
