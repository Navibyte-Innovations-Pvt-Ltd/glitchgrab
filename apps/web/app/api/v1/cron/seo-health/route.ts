export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createGitHubIssue, checkIssueIsOpen } from "@/lib/github";
import { getInstallationAccessToken } from "@/lib/github-app";

const SEO_LABEL = "glitchgrab-seo";

// ── Favicon check ─────────────────────────────────────

interface FaviconIssue { status: "Error" | "Warning"; text: string }

async function checkFavicon(domain: string): Promise<FaviconIssue[] | null> {
  try {
    const clean = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const res = await fetch(
      `https://realfavicongenerator.net/api/internal/favicon/check?pageUrl=${encodeURIComponent(clean)}`,
      { headers: { "User-Agent": "Glitchgrab/1.0" }, signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return null;
    const raw = (await res.json()) as { desktop: { messages: Array<{ status: string; text: string }> } };
    return raw.desktop.messages
      .filter((m) => m.status !== "Ok")
      .map((m) => ({ status: m.status as "Error" | "Warning", text: m.text }));
  } catch {
    return null;
  }
}

// ── OG check ─────────────────────────────────────────

interface OgIssue { severity: "error" | "warning"; field: string; message: string }

function getMeta(html: string, name: string): string | null {
  const tags = html.match(/<meta[^>]+>/gi) ?? [];
  for (const tag of tags) {
    const prop = tag.match(/property=["']([^"']*)["']/i)?.[1];
    const content = tag.match(/content=["']([^"']*)["']/i)?.[1];
    if (prop === name && content !== undefined) return content.trim();
  }
  return null;
}

async function checkOg(siteUrl: string): Promise<OgIssue[] | null> {
  try {
    const url = siteUrl.startsWith("sc-domain:")
      ? `https://${siteUrl.replace("sc-domain:", "")}`
      : siteUrl;
    const res = await fetch(url, {
      headers: { "User-Agent": "Glitchgrab/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const ogTitle = getMeta(html, "og:title");
    const ogDescription = getMeta(html, "og:description");
    const ogImage = getMeta(html, "og:image");
    const twitterCard = getMeta(html, "twitter:card");

    const issues: OgIssue[] = [];
    if (!ogTitle) issues.push({ severity: "error", field: "og:title", message: "Missing og:title" });
    else if (ogTitle.length > 70) issues.push({ severity: "warning", field: "og:title", message: `og:title is ${ogTitle.length} chars — recommended ≤70` });

    if (!ogDescription) issues.push({ severity: "error", field: "og:description", message: "Missing og:description" });
    else if (ogDescription.length > 160) issues.push({ severity: "warning", field: "og:description", message: `og:description is ${ogDescription.length} chars — recommended ≤160` });

    if (!ogImage) issues.push({ severity: "error", field: "og:image", message: "Missing og:image" });

    if (!twitterCard) issues.push({ severity: "warning", field: "twitter:card", message: "Missing twitter:card" });

    return issues;
  } catch {
    return null;
  }
}

// ── Build issue body ──────────────────────────────────

function buildIssueBody(
  siteUrl: string,
  notIndexedPages: Array<{ url: string; reason?: string }>,
  faviconIssues: FaviconIssue[] | null,
  ogIssues: OgIssue[] | null,
  date: string
): string {
  const lines: string[] = [
    `## SEO Health Report — ${siteUrl}`,
    ``,
    `Detected by Glitchgrab nightly cron on ${date}.`,
    ``,
  ];

  // Indexing section
  if (notIndexedPages.length > 0) {
    const grouped = notIndexedPages.reduce<Record<string, string[]>>((acc, p) => {
      const key = p.reason ?? "Unknown";
      (acc[key] ??= []).push(p.url);
      return acc;
    }, {});
    lines.push(`## 🔍 Indexing Issues (${notIndexedPages.length} pages not indexed)`, ``);
    for (const [reason, urls] of Object.entries(grouped)) {
      lines.push(`<details>`);
      lines.push(`<summary><strong>${reason}</strong> (${urls.length})</summary>`, ``);
      urls.forEach((u) => lines.push(`- ${u}`));
      lines.push(``, `</details>`, ``);
    }
  } else {
    lines.push(`## 🔍 Indexing`, ``, `✅ All checked pages are indexed.`, ``);
  }

  // Favicon section
  if (faviconIssues !== null) {
    const errors = faviconIssues.filter((i) => i.status === "Error");
    const warnings = faviconIssues.filter((i) => i.status === "Warning");
    if (faviconIssues.length > 0) {
      lines.push(`## 🖼️ Favicon Health`, ``);
      errors.forEach((i) => lines.push(`- ❌ ${i.text}`));
      warnings.forEach((i) => lines.push(`- ⚠️ ${i.text}`));
      lines.push(``);
    } else {
      lines.push(`## 🖼️ Favicon Health`, ``, `✅ No favicon issues.`, ``);
    }
  }

  // OG section
  if (ogIssues !== null) {
    const hasOgIssues = ogIssues.length > 0;
    if (hasOgIssues) {
      lines.push(`## 📣 Social / OG Tags`, ``);
      ogIssues.forEach((i) => lines.push(`- ${i.severity === "error" ? "❌" : "⚠️"} **${i.field}**: ${i.message}`));
      lines.push(``);
    } else {
      lines.push(`## 📣 Social / OG Tags`, ``, `✅ No OG issues.`, ``);
    }
  }

  lines.push(`---`);
  lines.push(`*Generated by [Glitchgrab](https://glitchgrab.dev) SEO Health Monitor*`);

  return lines.join("\n");
}

// ── Main handler ─────────────────────────────────────

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Only process properties that have a linked repo
  const properties = await prisma.gscProperty.findMany({
    where: { repoId: { not: null } },
    include: {
      repo: {
        select: { owner: true, name: true, installation: { select: { installationId: true } } },
      },
    },
  });

  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const results: Array<{ siteUrl: string; status: string }> = [];

  for (const property of properties) {
    try {
      if (!property.repo?.installation) {
        results.push({ siteUrl: property.siteUrl, status: "skipped: GitHub App not installed or no repo" });
        continue;
      }
      const githubToken = await getInstallationAccessToken(property.repo.installation.installationId);

      // Snooze: user reindexed recently — give Google time to re-crawl
      if (property.seoHealthSnoozedUntil && property.seoHealthSnoozedUntil > new Date()) {
        const daysLeft = Math.ceil((property.seoHealthSnoozedUntil.getTime() - Date.now()) / 86_400_000);
        results.push({ siteUrl: property.siteUrl, status: `snoozed: ${daysLeft}d remaining` });
        continue;
      }

      // Dedup: skip if existing open issue
      if (property.seoHealthIssueUrl) {
        const isOpen = await checkIssueIsOpen(githubToken, property.seoHealthIssueUrl);
        if (isOpen) {
          results.push({ siteUrl: property.siteUrl, status: "skipped: issue already open" });
          continue;
        }
      }

      const domain = property.siteUrl.startsWith("sc-domain:")
        ? property.siteUrl.replace("sc-domain:", "")
        : (() => { try { return new URL(property.siteUrl).hostname; } catch { return property.siteUrl; } })();

      // Run checks in parallel
      const [faviconIssues, ogIssues] = await Promise.all([
        checkFavicon(domain),
        checkOg(property.siteUrl),
      ]);

      const notIndexedPages = (property.cachedNotIndexedPages as Array<{ url: string; reason?: string }> | null) ?? [];

      // Skip if no issues at all
      const hasFaviconIssues = faviconIssues && faviconIssues.length > 0;
      const hasOgIssues = ogIssues && ogIssues.length > 0;
      const hasIndexingIssues = notIndexedPages.length > 0;

      if (!hasFaviconIssues && !hasOgIssues && !hasIndexingIssues) {
        results.push({ siteUrl: property.siteUrl, status: "skipped: no issues" });
        continue;
      }

      const body = buildIssueBody(property.siteUrl, notIndexedPages, faviconIssues, ogIssues, date);
      const errorCount = (faviconIssues?.filter((i) => i.status === "Error").length ?? 0) +
        (ogIssues?.filter((i) => i.severity === "error").length ?? 0) +
        (hasIndexingIssues ? 1 : 0);

      const issue = await createGitHubIssue(githubToken, {
        owner: property.repo.owner,
        repo: property.repo.name,
        title: `[SEO] ${errorCount > 0 ? "🔴" : "🟡"} Health issues found for ${domain} — ${date}`,
        body,
        labels: [SEO_LABEL],
      });

      await prisma.gscProperty.update({
        where: { id: property.id },
        data: { seoHealthIssueUrl: issue.url },
      });

      results.push({ siteUrl: property.siteUrl, status: `created: ${issue.url}` });
    } catch (err) {
      results.push({
        siteUrl: property.siteUrl,
        status: `error: ${err instanceof Error ? err.message : "unknown"}`,
      });
    }
  }

  return NextResponse.json({ success: true, data: { processed: properties.length, results } });
}
