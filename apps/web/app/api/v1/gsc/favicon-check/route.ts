export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

interface FaviconMessage {
  status: "Ok" | "Error" | "Warning";
  id: number;
  text: string;
}

interface FaviconCheckResult {
  pageTitle: string;
  desktop: {
    messages: FaviconMessage[];
    icon: string | null;
  };
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

  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  try {
    const res = await fetch(
      `https://realfavicongenerator.net/api/internal/favicon/check?pageUrl=${encodeURIComponent(cleanDomain)}`,
      { headers: { "User-Agent": "Glitchgrab/1.0" }, signal: AbortSignal.timeout(10_000) }
    );

    if (!res.ok) {
      return NextResponse.json({ success: false, error: "Favicon check service unavailable" }, { status: 502 });
    }

    const raw: FaviconCheckResult = await res.json();

    const issues = raw.desktop.messages.filter((m) => m.status !== "Ok");
    const errors = issues.filter((m) => m.status === "Error");
    const warnings = issues.filter((m) => m.status === "Warning");

    return NextResponse.json({
      success: true,
      data: {
        pageTitle: raw.pageTitle,
        currentFavicon: raw.desktop.icon ?? null,
        issues,
        errorCount: errors.length,
        warningCount: warnings.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: `Check failed: ${message}` }, { status: 500 });
  }
}
