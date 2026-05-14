export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getValidAccessToken } from "@/lib/gsc-tokens";
import { getSitemapUrls, inspectUrl, requestIndexing } from "@/lib/gsc";

const MAX_REINDEX_URLS = 200;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { propertyId: string };
  const { propertyId } = body;

  if (!propertyId) {
    return NextResponse.json({ success: false, error: "propertyId is required" }, { status: 400 });
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

  // Fetch sitemap live and find not-indexed URLs
  const sitemapUrls = await getSitemapUrls(accessToken, property.siteUrl);
  const urlsToCheck = sitemapUrls.slice(0, MAX_REINDEX_URLS);

  const notIndexedUrls: string[] = [];
  for (const url of urlsToCheck) {
    try {
      const result = await inspectUrl(accessToken, property.siteUrl, url);
      if (!result.indexed) notIndexedUrls.push(url);
    } catch {
      // Skip
    }
  }

  let submitted = 0;
  for (const url of notIndexedUrls) {
    try {
      await requestIndexing(accessToken, url);
      submitted++;
    } catch {
      // Skip per-URL failures
    }
  }

  // Snooze SEO health issue creation for 7 days — Google needs time to re-crawl
  const snoozedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.gscProperty.update({
    where: { id: propertyId },
    data: { seoHealthSnoozedUntil: snoozedUntil },
  });

  return NextResponse.json({ success: true, data: { submitted, checked: urlsToCheck.length, snoozedUntil: snoozedUntil.toISOString() } });
}
