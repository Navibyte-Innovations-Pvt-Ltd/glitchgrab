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

  const response = NextResponse.redirect(new URL("/dashboard", request.url));

  // Set the session cookie (same format NextAuth uses)
  response.cookies.set("authjs.session-token", token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return response;
}
