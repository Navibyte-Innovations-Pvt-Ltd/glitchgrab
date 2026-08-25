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

  // WhatsApp digest auto-login.
  //
  // Two jobs, both cheap:
  //
  //  1. Repair the encoded spelling. The digest's URL button is a fixed prefix
  //     plus one variable, so the suffix we send contains a `/`. Meta
  //     percent-encodes special characters in that value, and whether the slash
  //     survives is NOT verified — a click would then arrive as
  //     `/magic-link%2F<segment>`, a single segment that matches no route. Both
  //     spellings are accepted here rather than gambling on Meta's behaviour.
  //
  //  2. Do not spend the token on someone already signed in. The token is
  //     single-use; a signed-in visitor tapping yesterday's button would burn it
  //     for nothing and see "already used" on the next tap.
  const encodedMagic = path.startsWith("/magic-link%2F") || path.startsWith("/magic-link%2f");
  if (encodedMagic) {
    const segment = path.slice("/magic-link%2F".length);
    const repaired = request.nextUrl.clone();
    repaired.pathname = `/magic-link/${segment}`;
    return NextResponse.redirect(repaired);
  }

  if (path.startsWith("/magic-link/")) {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
      cookieName: "authjs.session-token",
    });
    if (token) {
      // Decoded inline rather than importing lib/magic-login: this file runs on
      // the edge runtime, where pulling in the Prisma client would fail.
      const segment = path.slice("/magic-link/".length);
      const dot = segment.indexOf(".");
      const encoded = dot === -1 ? "" : segment.slice(dot + 1);
      let target = "/dashboard";
      if (encoded) {
        try {
          const padded = encoded
            .replace(/-/g, "+")
            .replace(/_/g, "/")
            .padEnd(Math.ceil(encoded.length / 4) * 4, "=");
          const decoded = atob(padded);
          // Same rule as safeTargetPath: same-site paths only. `//evil.com` has
          // no scheme but browsers treat it as absolute.
          if (decoded.startsWith("/") && !decoded.startsWith("//") && !decoded.includes("\\")) {
            target = decoded;
          }
        } catch {
          /* keep the default */
        }
      }
      const url = request.nextUrl.clone();
      url.pathname = target;
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Dashboard auth guard + org redirect (fast path via JWT cache)
  if (path.startsWith("/dashboard")) {
    // Testers are NOT NextAuth users — they carry the gg_tester cookie instead.
    // Presence is enough here (the cookie is HMAC-signed and re-verified by the
    // layout before anything renders); the point of this branch is to keep the
    // tester OUT of every owner surface. A tester gets exactly /dashboard and
    // nothing below it: no /dashboard/repos, /billing, /settings, /tokens, and
    // no /org/<slug> redirect. Anything else bounces back to /dashboard.
    const hasTesterCookie = Boolean(request.cookies.get("gg_tester")?.value);
    if (hasTesterCookie) {
      const ownerToken = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
      });
      if (!ownerToken) {
        if (path !== "/dashboard" && path !== "/dashboard/") {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        const testerHeaders = new Headers(request.headers);
        testerHeaders.set("x-pathname", path);
        return NextResponse.next({ request: { headers: testerHeaders } });
      }
    }

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

    // Fast path: JWT already has orgSlug cached → redirect immediately.
    //
    // Every owner path redirects, with no exceptions. There used to be a
    // CONFIG_PATHS escape hatch for /settings, /tokens, /billing and /members,
    // on the theory that those were user-level rather than org-level. What it
    // actually did was strand people: the org sidebar linked to
    // /org/<slug>/settings, that page redirected to /dashboard/settings, and
    // you arrived in the dashboard shell whose sidebar has no slug in it. Those
    // four now render inside the org shell, so the exception is gone — and if
    // it ever comes back it has to come back in BOTH places, here and in
    // app/dashboard/layout.tsx, which carries the same logic as a fallback.
    const orgSlug = token.orgSlug as string | null | undefined;
    if (orgSlug) {
      const subPath = path.slice("/dashboard".length);
      const target = request.nextUrl.clone();
      target.pathname = `/org/${orgSlug}${subPath}`;
      // Carry the query string over. Several callbacks land here with state in
      // it — /dashboard/repos?error=missing_installation from the GitHub App
      // install, ?calendar=connected from the Google OAuth return — and
      // building the URL from the pathname alone silently ate all of it, so the
      // page rendered as if nothing had gone wrong.
      return NextResponse.redirect(target);
    }
    // No orgSlug in JWT yet → fall through; layout.tsx does DB lookup as fallback
  }

  // Forward pathname so server-component layouts can read it via headers()
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", path);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/api/v1/sdk/:path*",
    "/api/v1/reports/:path*",
    "/dashboard/:path*",
    "/magic-link/:path*",
    // The percent-encoded spelling matches no `:path*` pattern — it is one
    // literal segment — so it needs its own entry.
    "/magic-link%2F:path*",
  ],
};
