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

  return (
    <GlitchgrabProvider
      token={process.env.NEXT_PUBLIC_GLITCHGRAB_TOKEN ?? ""}
      session={session}
    >
      {children}
    </GlitchgrabProvider>
  );
}
