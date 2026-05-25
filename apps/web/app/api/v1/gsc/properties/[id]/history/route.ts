export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_HISTORY_LIMIT = 200;
const DEFAULT_HISTORY_LIMIT = 60;

/**
 * GET /api/v1/gsc/properties/[id]/history
 *
 * Returns the indexing history (per-sync / per-reindex snapshots) for a GSC
 * property owned by the current user. Used by the SEO detail page chart.
 *
 * Query params:
 *   - limit (optional): number of snapshots to return, default 60, max 200.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id: propertyId } = await params;

  const property = await prisma.gscProperty.findFirst({
    where: { id: propertyId, userId: session.user.id },
    select: { id: true },
  });

  if (!property) {
    return NextResponse.json(
      { success: false, error: "Property not found" },
      { status: 404 }
    );
  }

  const url = new URL(request.url);
  const limitRaw = url.searchParams.get("limit");
  const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : NaN;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, MAX_HISTORY_LIMIT)
    : DEFAULT_HISTORY_LIMIT;

  // Fetch most-recent N snapshots, then reverse to chronological order so the
  // chart can plot left-to-right oldest-to-newest without extra work on the client.
  const snapshots = await prisma.gscIndexingSnapshot.findMany({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      kind: true,
      indexedCount: true,
      notIndexedCount: true,
      totalChecked: true,
      submittedCount: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      snapshots: snapshots.reverse().map((s: { id: string; kind: string; indexedCount: number; notIndexedCount: number; totalChecked: number; submittedCount: number; createdAt: Date }) => ({
        id: s.id,
        kind: s.kind,
        indexedCount: s.indexedCount,
        notIndexedCount: s.notIndexedCount,
        totalChecked: s.totalChecked,
        submittedCount: s.submittedCount,
        createdAt: s.createdAt.toISOString(),
      })),
    },
  });
}
