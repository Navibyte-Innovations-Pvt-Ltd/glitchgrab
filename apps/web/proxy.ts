import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // CORS for API routes called from external domains (SDK users)
  if (path.startsWith("/api/v1/sdk") || path.startsWith("/api/v1/reports")) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return response;
  }

  // Dashboard auth guard + org redirect (fast path via JWT cache)
  if (path.startsWith("/dashboard")) {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const callbackUrl = path + request.nextUrl.search;
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", callbackUrl);
      return NextResponse.redirect(loginUrl);
    }

    // Fast path: JWT already has orgSlug cached → redirect immediately
    // Config paths are user-level (not org-scoped) — skip redirect to avoid loops
    const CONFIG_PATHS = ["/settings", "/tokens", "/billing", "/members"];
    const orgSlug = token.orgSlug as string | null | undefined;
    if (orgSlug) {
      const subPath = path.slice("/dashboard".length);
      if (!CONFIG_PATHS.some((p) => subPath.startsWith(p))) {
        return NextResponse.redirect(new URL(`/org/${orgSlug}${subPath}`, request.url));
      }
    }
    // No orgSlug in JWT yet → fall through; layout.tsx does DB lookup as fallback
  }

  // Forward pathname so server-component layouts can read it via headers()
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", path);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/api/v1/sdk/:path*", "/api/v1/reports/:path*", "/dashboard/:path*"],
};
