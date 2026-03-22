import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glitchgrab — Turn messy bugs into GitHub issues with AI",
  description:
    "Convert handwritten notes, screenshots, production errors, and user complaints into well-structured GitHub issues. Powered by AI. Open source.",
  openGraph: {
    title: "Glitchgrab — Grab the glitch. Ship the fix.",
    description:
      "Turn messy bug reports into structured GitHub issues with AI. SDK auto-capture, handwritten notes, screenshots — all become clean issues.",
    siteName: "Glitchgrab",
    images: [{ url: "/og-image.png", width: 1500, height: 844 }],
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
