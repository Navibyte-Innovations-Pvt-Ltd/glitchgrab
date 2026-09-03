import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * OAuth discovery lives at fixed /.well-known paths the spec dictates, but the
   * handlers live under /api/oauth. Rewrites rather than a literal `.well-known`
   * route folder, whose leading dot is not a routing convention worth relying on.
   *
   * The `/api/mcp`-suffixed variants exist because clients differ on whether
   * discovery is looked up per-resource-path or at the host root — serving both
   * is cheaper than guessing which one Claude Code asks for.
   */
  async rewrites() {
    return [
      {
        source: "/.well-known/oauth-protected-resource",
        destination: "/api/oauth/protected-resource",
      },
      {
        source: "/.well-known/oauth-protected-resource/api/mcp",
        destination: "/api/oauth/protected-resource",
      },
      {
        source: "/.well-known/oauth-authorization-server",
        destination: "/api/oauth/authorization-server",
      },
      {
        source: "/.well-known/oauth-authorization-server/api/mcp",
        destination: "/api/oauth/authorization-server",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/month",
        destination: "/dashboard/billing",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "github.com" },
    ],
  },
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  turbopack: {
    resolveAlias: {
      glitchgrab: "./../../packages/sdk-nextjs/dist/index.mjs",
    },
  },
};

export default nextConfig;