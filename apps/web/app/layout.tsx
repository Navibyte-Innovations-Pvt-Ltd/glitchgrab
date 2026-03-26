import type { Metadata } from "next";
import "./globals.css";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { GlitchgrabSDKProvider } from "@/components/providers/glitchgrab-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  metadataBase: new URL("https://glitchgrab.dev"),
  title: "Glitchgrab — Turn messy bugs into GitHub issues with AI",
  description:
    "Convert handwritten notes, screenshots, production errors, and user complaints into well-structured GitHub issues. Powered by AI. Open source.",
  openGraph: {
    title: "Glitchgrab — Grab the glitch. Ship the fix.",
    description:
      "Turn messy bug reports into structured GitHub issues with AI. SDK auto-capture, handwritten notes, screenshots — all become clean issues.",
    siteName: "Glitchgrab",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Glitchgrab — Grab the glitch. Ship the fix.",
    description:
      "Turn messy bug reports into structured GitHub issues with AI.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthSessionProvider>
          <QueryProvider>
            <GlitchgrabSDKProvider>
              {children}
            </GlitchgrabSDKProvider>
          </QueryProvider>
          <Toaster />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
