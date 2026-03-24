export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

/**
 * GET /api/auth/mobile/session?token=xxx
 *
 * Sets the session cookie and redirects to dashboard.
 * Used by the mobile app to inject the session into the WebView.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isProduction = process.env.NODE_ENV === "production";
  const cookieName = isProduction
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const response = NextResponse.redirect(new URL("/dashboard", request.url));

  response.cookies.set(cookieName, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
}
