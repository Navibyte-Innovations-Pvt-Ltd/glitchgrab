export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

interface OgCheckResult {
  tags: {
    title: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    ogUrl: string | null;
    twitterCard: string | null;
    twitterTitle: string | null;
    twitterDescription: string | null;
    twitterImage: string | null;
  };
  issues: { severity: "error" | "warning"; field: string; message: string }[];
}

function getMeta(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${name}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function getTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim() ?? null;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const domain = request.nextUrl.searchParams.get("domain");
  if (!domain) {
    return NextResponse.json({ success: false, error: "Missing domain" }, { status: 400 });
  }

  const url = domain.startsWith("http") ? domain : `https://${domain}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Glitchgrab/1.0 (+https://glitchgrab.dev)" },
      signal: AbortSignal.timeout(10_000),
    });

    const html = await res.text();

    const tags: OgCheckResult["tags"] = {
      title: getTitle(html),
      ogTitle: getMeta(html, "og:title"),
      ogDescription: getMeta(html, "og:description"),
      ogImage: getMeta(html, "og:image"),
      ogUrl: getMeta(html, "og:url"),
      twitterCard: getMeta(html, "twitter:card"),
      twitterTitle: getMeta(html, "twitter:title"),
      twitterDescription: getMeta(html, "twitter:description"),
      twitterImage: getMeta(html, "twitter:image"),
    };

    const issues: OgCheckResult["issues"] = [];

    if (!tags.ogTitle) {
      issues.push({ severity: "error", field: "og:title", message: "Missing og:title" });
    } else if (tags.ogTitle.length > 70) {
      issues.push({ severity: "warning", field: "og:title", message: `og:title too long (${tags.ogTitle.length} chars, recommended ≤70)` });
    }

    if (!tags.ogDescription) {
      issues.push({ severity: "error", field: "og:description", message: "Missing og:description" });
    } else if (tags.ogDescription.length > 160) {
      issues.push({ severity: "warning", field: "og:description", message: `og:description too long (${tags.ogDescription.length} chars, recommended ≤160)` });
    }

    if (!tags.ogImage) {
      issues.push({ severity: "error", field: "og:image", message: "Missing og:image — required for link previews on social media" });
    }

    if (!tags.twitterCard) {
      issues.push({ severity: "warning", field: "twitter:card", message: "Missing twitter:card — set to 'summary_large_image' for rich Twitter/X previews" });
    }

    if (!tags.twitterImage && !tags.ogImage) {
      issues.push({ severity: "warning", field: "twitter:image", message: "No twitter:image or og:image fallback for Twitter/X" });
    }

    if (!tags.ogUrl) {
      issues.push({ severity: "warning", field: "og:url", message: "Missing og:url — helps social platforms canonicalise the shared URL" });
    }

    return NextResponse.json({ success: true, data: { tags, issues } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: `Fetch failed: ${message}` }, { status: 500 });
  }
}
