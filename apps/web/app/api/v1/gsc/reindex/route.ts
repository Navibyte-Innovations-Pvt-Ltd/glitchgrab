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
  let firstError: string | null = null;
  for (const url of notIndexedUrls) {
    try {
      await requestIndexing(accessToken, url);
      submitted++;
    } catch (err) {
      if (!firstError) firstError = err instanceof Error ? err.message : String(err);
    }
  }

  // Snooze SEO health issue creation for 7 days — Google needs time to re-crawl
  const snoozedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.gscProperty.update({
    where: { id: propertyId },
    data: { seoHealthSnoozedUntil: snoozedUntil },
  });

  // Record this reindex action in the indexing-history timeline.
  // Failures here must not break the user-facing reindex.
  const checkedTotal = urlsToCheck.length;
  const indexedAtCheck = checkedTotal - notIndexedUrls.length;
  try {
    await prisma.gscIndexingSnapshot.create({
      data: {
        propertyId,
        kind: "reindex",
        indexedCount: indexedAtCheck,
        notIndexedCount: notIndexedUrls.length,
        totalChecked: checkedTotal,
        submittedCount: submitted,
      },
    });
  } catch (err) {
    console.error("Failed to record reindex snapshot", err);
  }

  return NextResponse.json({ success: true, data: { submitted, failed: notIndexedUrls.length - submitted, checked: urlsToCheck.length, snoozedUntil: snoozedUntil.toISOString(), ...(firstError ? { indexingApiError: firstError } : {}) } });
}
