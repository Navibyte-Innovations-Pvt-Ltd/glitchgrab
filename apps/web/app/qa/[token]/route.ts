export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  signTesterSession,
  TESTER_COOKIE_NAME,
  TESTER_COOKIE_MAX_AGE,
} from "@/lib/tester-session";

/**
 * GET /qa/<magicToken> — the link every tester WhatsApp/SMS already carries.
 *
 * It used to render a standalone QA page that lived outside the product. Now it
 * exchanges the token for the same gg_tester cookie the OTP login issues and
 * drops the tester on /dashboard, so there is exactly one tester surface. Links
 * already sent keep working; nobody has to be re-invited.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const tester = await prisma.tester.findUnique({
    where: { magicToken: token },
    select: { id: true },
  });

  if (!tester) {
    // Never 404 with detail — a wrong token should not tell a stranger whether
    // it was close. Send them to the login page like any signed-out visitor.
    return NextResponse.redirect(new URL("/login?tab=tester", request.url));
  }

  // Relative to the request, not NEXTAUTH_URL — a preview deployment or a
  // localhost dev server must not bounce the tester to production.
  const res = NextResponse.redirect(new URL("/dashboard", request.url));
  res.cookies.set(TESTER_COOKIE_NAME, signTesterSession(tester.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TESTER_COOKIE_MAX_AGE,
  });
  return res;
}
