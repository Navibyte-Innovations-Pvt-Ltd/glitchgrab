export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { decode } from "next-auth/jwt";

/**
 * GET /api/auth/mobile/session?token=xxx
 *
 * Sets the session cookie and returns an HTML page that navigates to dashboard.
 * Returns HTML instead of a 307 redirect so the browser has time to persist
 * the Set-Cookie header before navigating (Android WebView can drop cookies
 * on immediate redirects).
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

  // Verify the JWT is decodable before setting it
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  try {
    const decoded = await decode({ token, secret: secret!, salt: cookieName });
    console.info("[mobile-session] JWT decode OK:", JSON.stringify(decoded));
  } catch (err) {
    console.error("[mobile-session] JWT decode FAILED:", err);
    console.error("[mobile-session] salt:", cookieName, "secret set:", !!secret);
  }

  const dashboardUrl = new URL("/dashboard", request.url).toString();

  console.info("[mobile-session] Setting cookie:", cookieName, "token length:", token.length, "redirecting to:", dashboardUrl);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body><script>window.location.replace("${dashboardUrl}");</script></body></html>`;

  const response = new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

  response.cookies.set(cookieName, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 30 * 24 * 60 * 60,
    domain: isProduction ? ".glitchgrab.dev" : undefined,
  });

  return response;
}
