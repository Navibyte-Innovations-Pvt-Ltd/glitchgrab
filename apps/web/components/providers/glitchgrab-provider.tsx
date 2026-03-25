"use client";

import { GlitchgrabProvider, ReportButton } from "glitchgrab";

const GLITCHGRAB_TOKEN = process.env.NEXT_PUBLIC_GLITCHGRAB_TOKEN ?? "";

export function GlitchgrabSDKProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!GLITCHGRAB_TOKEN) {
    return <>{children}</>;
  }

  return (
    <GlitchgrabProvider
      token={GLITCHGRAB_TOKEN}
      baseUrl={typeof window !== "undefined" ? window.location.origin : ""}
    >
      {children}
      <ReportButton position="bottom-right" />
    </GlitchgrabProvider>
  );
}
