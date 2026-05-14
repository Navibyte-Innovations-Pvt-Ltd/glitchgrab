import type { Metadata } from "next";
import "./globals.css";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { GlitchgrabSDKProvider } from "@/components/providers/glitchgrab-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/json-ld";

const BASE_URL = "https://glitchgrab.dev";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Glitchgrab — Turn messy bugs into GitHub issues with AI",
    template: "%s — Glitchgrab",
  },
  description:
    "Convert screenshots, production errors, and user complaints into well-structured GitHub issues. Powered by AI. Open source.",
  keywords: [
    "ai bug reporting tool",
    "github issue automation",
    "bug report to github issue",
    "nextjs error capture sdk",
    "production error tracking",
    "screenshot to github issue",
    "automated bug tracking developer tool",
    "open source bug reporting",
    "ai issue creator",
    "developer error monitoring",
    "unhandled error capture nextjs",
    "user bug report widget",
  ],
  authors: [{ name: "Navibyte Innovations Pvt. Ltd.", url: BASE_URL }],
  creator: "Navibyte Innovations Pvt. Ltd.",
  alternates: {
    canonical: BASE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Glitchgrab",
    title: "Glitchgrab — Grab the glitch. Ship the fix.",
    description:
      "Turn messy bug reports into structured GitHub issues with AI. SDK auto-capture, screenshots, user reports — all become clean issues.",
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Glitchgrab — Grab the glitch. Ship the fix.",
    description:
      "Turn messy bug reports into structured GitHub issues with AI.",
    images: [`${BASE_URL}/og-image.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
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
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <OrganizationJsonLd />
        <WebSiteJsonLd />
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
