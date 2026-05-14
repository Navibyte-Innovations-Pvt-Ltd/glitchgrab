export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Platform-specific limits
const WHATSAPP_SAFE_IMAGE_KB = 300;  // no official spec; community-observed safe threshold ~300KB (theoretical max ~600KB)
const TWITTER_MAX_IMAGE_KB = 5120;   // 5 MB
const FB_MAX_IMAGE_KB = 8192;        // 8 MB
const OG_IMAGE_MIN_W = 200;
const OG_IMAGE_REC_W = 1200;
const OG_IMAGE_REC_H = 630;

interface Issue {
  severity: "error" | "warning";
  field: string;
  message: string;
  platform?: string;
}

interface OgTags {
  title: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogImageWidth: string | null;
  ogImageHeight: string | null;
  ogUrl: string | null;
  twitterCard: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
}

interface ImageInfo {
  sizeKb: number | null;
  width: number | null;
  height: number | null;
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

async function fetchImageInfo(imageUrl: string): Promise<ImageInfo> {
  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "Glitchgrab/1.0" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return { sizeKb: null, width: null, height: null };

    // Get file size from content-length header first (fast path)
    const contentLength = res.headers.get("content-length");
    let sizeKb: number | null = contentLength ? Math.round(parseInt(contentLength) / 1024) : null;

    // If no content-length, read body to get size
    if (sizeKb === null) {
      const buf = await res.arrayBuffer();
      sizeKb = Math.round(buf.byteLength / 1024);
    }

    return { sizeKb, width: null, height: null };
  } catch {
    return { sizeKb: null, width: null, height: null };
  }
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

    const tags: OgTags = {
      title: getTitle(html),
      ogTitle: getMeta(html, "og:title"),
      ogDescription: getMeta(html, "og:description"),
      ogImage: getMeta(html, "og:image"),
      ogImageWidth: getMeta(html, "og:image:width"),
      ogImageHeight: getMeta(html, "og:image:height"),
      ogUrl: getMeta(html, "og:url"),
      twitterCard: getMeta(html, "twitter:card"),
      twitterTitle: getMeta(html, "twitter:title"),
      twitterDescription: getMeta(html, "twitter:description"),
      twitterImage: getMeta(html, "twitter:image"),
    };

    const issues: Issue[] = [];

    // Fetch image info once (used in multiple checks below)
    const effectiveImage = tags.ogImage ?? tags.twitterImage;
    const imgInfo: ImageInfo = effectiveImage
      ? await fetchImageInfo(effectiveImage)
      : { sizeKb: null, width: null, height: null };

    // ── og:title ────────────────────────────────────────────
    if (!tags.ogTitle) {
      issues.push({ severity: "error", field: "og:title", message: "Missing og:title" });
    } else if (tags.ogTitle.length > 70) {
      issues.push({ severity: "warning", field: "og:title", message: `og:title is ${tags.ogTitle.length} chars — Facebook truncates after 60–70` });
    }

    // ── og:description ──────────────────────────────────────
    if (!tags.ogDescription) {
      issues.push({ severity: "error", field: "og:description", message: "Missing og:description" });
    } else if (tags.ogDescription.length > 160) {
      issues.push({ severity: "warning", field: "og:description", message: `og:description is ${tags.ogDescription.length} chars — recommended ≤160` });
    }

    // ── og:url ──────────────────────────────────────────────
    if (!tags.ogUrl) {
      issues.push({ severity: "warning", field: "og:url", message: "Missing og:url — helps social platforms canonicalise the shared URL" });
    }

    // ── og:image ────────────────────────────────────────────
    if (!effectiveImage) {
      issues.push({ severity: "error", field: "og:image", message: "Missing og:image — no preview image on any platform", platform: "All" });
    } else {
      // Declared dimensions
      const declaredW = tags.ogImageWidth ? parseInt(tags.ogImageWidth) : null;
      const declaredH = tags.ogImageHeight ? parseInt(tags.ogImageHeight) : null;

      if (!declaredW || !declaredH) {
        issues.push({ severity: "warning", field: "og:image:width / og:image:height", message: "Add og:image:width and og:image:height to avoid layout shift on social platforms" });
      } else {
        if (declaredW < OG_IMAGE_MIN_W) {
          issues.push({ severity: "error", field: "og:image:width", message: `Image width ${declaredW}px is below minimum 200px (Facebook will ignore it)`, platform: "Facebook" });
        }
        if (declaredW < OG_IMAGE_REC_W || declaredH < OG_IMAGE_REC_H) {
          issues.push({ severity: "warning", field: "og:image", message: `Declared size ${declaredW}×${declaredH}px — recommended 1200×630px for all platforms`, platform: "All" });
        }
      }

      if (imgInfo.sizeKb !== null) {
        if (imgInfo.sizeKb > WHATSAPP_SAFE_IMAGE_KB) {
          issues.push({
            severity: "warning",
            field: "og:image",
            message: `Image is ${imgInfo.sizeKb}KB — WhatsApp has no official limit but community data shows previews can fail above ~300KB. Compress to <300KB for reliability.`,
            platform: "WhatsApp",
          });
        }
        if (imgInfo.sizeKb > FB_MAX_IMAGE_KB) {
          issues.push({ severity: "error", field: "og:image", message: `Image is ${imgInfo.sizeKb}KB — exceeds Facebook's 8MB limit`, platform: "Facebook" });
        } else if (imgInfo.sizeKb > TWITTER_MAX_IMAGE_KB) {
          issues.push({ severity: "warning", field: "og:image", message: `Image is ${imgInfo.sizeKb}KB — exceeds Twitter/X's 5MB limit`, platform: "Twitter/X" });
        }
      }

      // WhatsApp: warn if declared dimensions are below 300×200px minimum
      if (tags.ogImageWidth && tags.ogImageHeight) {
        const w = parseInt(tags.ogImageWidth);
        const h = parseInt(tags.ogImageHeight);
        if (w < 300 || h < 200) {
          issues.push({
            severity: "warning",
            field: "og:image",
            message: `Declared size ${w}×${h}px — WhatsApp requires at least 300×200px to show a preview`,
            platform: "WhatsApp",
          });
        }
      }
    }

    // ── Twitter/X ────────────────────────────────────────────
    if (!tags.twitterCard) {
      issues.push({ severity: "warning", field: "twitter:card", message: "Missing twitter:card — set to 'summary_large_image' for rich Twitter/X previews", platform: "Twitter/X" });
    } else if (tags.twitterCard !== "summary_large_image" && tags.twitterCard !== "summary") {
      issues.push({ severity: "warning", field: "twitter:card", message: `twitter:card value '${tags.twitterCard}' is non-standard — use 'summary_large_image'`, platform: "Twitter/X" });
    }

    if (!tags.twitterImage && tags.ogImage) {
      issues.push({ severity: "warning", field: "twitter:image", message: "twitter:image not set — Twitter/X will fall back to og:image (usually fine, but explicit is better)", platform: "Twitter/X" });
    }

    return NextResponse.json({
      success: true,
      data: { tags, issues, imageInfo: imgInfo },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: `Fetch failed: ${message}` }, { status: 500 });
  }
}
