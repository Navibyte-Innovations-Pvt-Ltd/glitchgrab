export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getValidAccessToken } from "@/lib/gsc-tokens";
import { inspectUrl } from "@/lib/gsc";

const CONCURRENCY = 10;
const MAX_URLS = 50;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: propertyId } = await params;
  const body = (await request.json()) as { urls?: string[] };

  if (!Array.isArray(body.urls) || body.urls.length === 0) {
    return NextResponse.json({ success: false, error: "urls is required" }, { status: 400 });
  }

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

  const urlsToCheck = body.urls.slice(0, MAX_URLS);
  const nowIndexed: string[] = [];
  const stillNotIndexed: Array<{ url: string; reason?: string }> = [];

  for (let i = 0; i < urlsToCheck.length; i += CONCURRENCY) {
    const batch = urlsToCheck.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((url) => inspectUrl(accessToken, property.siteUrl, url).then((r) => ({ url, ...r })))
    );
    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.indexed) {
          nowIndexed.push(result.value.url);
        } else {
          stillNotIndexed.push({ url: result.value.url, reason: result.value.reason });
        }
      }
    }
  }

  // Merge results back into the cached list
  const cached = (property.cachedNotIndexedPages as Array<{ url: string; reason?: string }> | null) ?? [];
  const checkedSet = new Set(urlsToCheck);
  const updatedCache = [
    ...cached.filter((p) => !checkedSet.has(p.url)),
    ...stillNotIndexed,
  ];

  await prisma.gscProperty.update({
    where: { id: propertyId },
    data: {
      indexedCount: property.indexedCount + nowIndexed.length,
      notIndexedCount: updatedCache.length,
      cachedNotIndexedPages: updatedCache,
      lastSyncAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      nowIndexed,
      stillNotIndexed,
      nowIndexedCount: nowIndexed.length,
      stillNotIndexedCount: stillNotIndexed.length,
    },
  });
}
