export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

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

  // Use non-prefixed cookie name — Android WebView silently rejects
  // __Secure- prefix cookies. NextAuth reads both cookie names.
  const cookieName = "authjs.session-token";

  const dashboardUrl = new URL("/dashboard", request.url).toString();

  console.info("[mobile-session] Setting cookie:", cookieName, "token length:", token.length, "redirecting to:", dashboardUrl);

  // Delayed redirect to ensure cookie is persisted before navigation
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<meta http-equiv="refresh" content="2;url=${dashboardUrl}"/>
</head><body>
<script>
setTimeout(function() {
  window.location.replace("${dashboardUrl}");
}, 1500);
</script>
</body></html>`;

  const response = new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

  response.cookies.set(cookieName, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
}
