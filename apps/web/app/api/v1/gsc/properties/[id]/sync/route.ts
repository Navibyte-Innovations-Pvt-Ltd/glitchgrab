export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getValidAccessToken } from "@/lib/gsc-tokens";
import { getSitemapUrls, inspectUrl } from "@/lib/gsc";

const MAX_URLS_PER_SYNC = 100;
const CONCURRENCY = 10;

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

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: propertyId } = await params;

  const property = await prisma.gscProperty.findFirst({
    where: { id: propertyId, userId: session.user.id },
  });

  if (!property) {
    return NextResponse.json({ success: false, error: "Property not found" }, { status: 404 });
  }

  const accessToken = await getValidAccessToken(propertyId);
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: "No valid access token. Please reconnect GSC." },
      { status: 401 }
    );
  }

  const sitemapUrls = await getSitemapUrls(accessToken, property.siteUrl);

  if (sitemapUrls.length === 0) {
    return NextResponse.json({
      success: true,
      data: { synced: 0, indexed: 0, notIndexed: 0, notIndexedPages: [], noSitemap: true },
    });
  }

  const urlsToCheck = sitemapUrls.slice(0, MAX_URLS_PER_SYNC);

  let indexed = 0;
  let notIndexed = 0;
  const notIndexedPages: Array<{ url: string; reason?: string }> = [];

  // Process in concurrent batches instead of sequentially
  for (let i = 0; i < urlsToCheck.length; i += CONCURRENCY) {
    const batch = urlsToCheck.slice(i, i + CONCURRENCY);
    const batchResults = await inspectBatch(accessToken, property.siteUrl, batch);
    for (const result of batchResults) {
      if (result.indexed) {
        indexed++;
      } else {
        notIndexed++;
        notIndexedPages.push({ url: result.url, reason: result.reason });
      }
    }
  }

  await prisma.gscProperty.update({
    where: { id: propertyId },
    data: {
      indexedCount: indexed,
      notIndexedCount: notIndexed,
      lastSyncAt: new Date(),
      cachedNotIndexedPages: notIndexedPages,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      synced: urlsToCheck.length,
      indexed,
      notIndexed,
      notIndexedPages,
    },
  });
}
