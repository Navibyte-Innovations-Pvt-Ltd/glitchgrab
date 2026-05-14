import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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