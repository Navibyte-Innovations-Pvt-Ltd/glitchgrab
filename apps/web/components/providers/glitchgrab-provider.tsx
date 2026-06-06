"use client";

import { GlitchgrabProvider } from "glitchgrab";
import { useSession } from "next-auth/react";

export function GlitchgrabSDKProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: authSession } = useSession();

  const session = authSession?.user
    ? {
        userId: authSession.user.id ?? "",
        name: authSession.user.name ?? "Unknown",
        email: authSession.user.email,
      }
    : null;

  // Use current origin so API calls (STT, enhance) hit the right server in both dev and prod
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://glitchgrab.dev";

  return (
    <GlitchgrabProvider
      token={process.env.NEXT_PUBLIC_GLITCHGRAB_TOKEN ?? ""}
      baseUrl={baseUrl}
      session={session}
    >
      {children}
    </GlitchgrabProvider>
  );
}
