export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getValidAccessToken } from "@/lib/gsc-tokens";
import { getSitemapUrls, inspectUrl } from "@/lib/gsc";

const CONCURRENCY = 10;
const MAX_URLS = 50; // keep cron fast; user can run full 100-URL sync manually

async function inspectBatch(
  accessToken: string,
  siteUrl: string,
  urls: string[]
): Promise<Array<{ url: string; indexed: boolean; reason?: string }>> {
  const results = await Promise.allSettled(
    urls.map((url) => inspectUrl(accessToken, siteUrl, url).then((r) => ({ url, ...r })))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<{ url: string; indexed: boolean; reason?: string }> => r.status === "fulfilled")
    .map((r) => r.value);
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const properties = await prisma.gscProperty.findMany({
    select: { id: true, siteUrl: true },
  });

  const results: Array<{ id: string; siteUrl: string; status: string; synced?: number }> = [];

  for (const property of properties) {
    try {
      const accessToken = await getValidAccessToken(property.id);
      if (!accessToken) {
        results.push({ id: property.id, siteUrl: property.siteUrl, status: "skipped: no token" });
        continue;
      }

      const sitemapUrls = await getSitemapUrls(accessToken, property.siteUrl, MAX_URLS);
      const urlsToCheck = sitemapUrls.slice(0, MAX_URLS);

      if (urlsToCheck.length === 0) {
        results.push({ id: property.id, siteUrl: property.siteUrl, status: "skipped: no sitemap urls" });
        continue;
      }

      let indexed = 0;
      const notIndexedPages: Array<{ url: string; reason?: string }> = [];

      for (let i = 0; i < urlsToCheck.length; i += CONCURRENCY) {
        const batch = urlsToCheck.slice(i, i + CONCURRENCY);
        const batchResults = await inspectBatch(accessToken, property.siteUrl, batch);
        for (const result of batchResults) {
          if (result.indexed) {
            indexed++;
          } else {
            notIndexedPages.push({ url: result.url, reason: result.reason });
          }
        }
      }

      await prisma.gscProperty.update({
        where: { id: property.id },
        data: {
          indexedCount: indexed,
          notIndexedCount: notIndexedPages.length,
          lastSyncAt: new Date(),
          cachedNotIndexedPages: notIndexedPages,
        },
      });

      results.push({
        id: property.id,
        siteUrl: property.siteUrl,
        status: "synced",
        synced: urlsToCheck.length,
      });
    } catch (err) {
      results.push({
        id: property.id,
        siteUrl: property.siteUrl,
        status: `error: ${err instanceof Error ? err.message : "unknown"}`,
      });
    }
  }

  return NextResponse.json({ success: true, data: { processed: properties.length, results } });
}
