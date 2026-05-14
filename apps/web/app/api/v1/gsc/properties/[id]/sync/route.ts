export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getValidAccessToken } from "@/lib/gsc-tokens";
import { getSitemapUrls, inspectUrl } from "@/lib/gsc";

const MAX_URLS_PER_SYNC = 100;

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
  const urlsToCheck = sitemapUrls.slice(0, MAX_URLS_PER_SYNC);

  let indexed = 0;
  let notIndexed = 0;
  const notIndexedPages: Array<{ url: string; reason?: string }> = [];

  for (const url of urlsToCheck) {
    try {
      const result = await inspectUrl(accessToken, property.siteUrl, url);
      if (result.indexed) {
        indexed++;
      } else {
        notIndexed++;
        notIndexedPages.push({ url, reason: result.reason });
      }
    } catch {
      // Skip individual URL failures
    }
  }

  // Store only the summary counts, not per-page data
  await prisma.gscProperty.update({
    where: { id: propertyId },
    data: {
      indexedCount: indexed,
      notIndexedCount: notIndexed,
      lastSyncAt: new Date(),
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
