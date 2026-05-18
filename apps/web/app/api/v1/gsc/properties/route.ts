export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const properties = await prisma.gscProperty.findMany({
    where: { userId: session.user.id },
    include: { repo: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: properties.map((p) => ({
      id: p.id,
      siteUrl: p.siteUrl,
      repoId: p.repoId,
      repo: p.repo,
      indexedCount: p.indexedCount,
      notIndexedCount: p.notIndexedCount,
      notIndexedPages: p.cachedNotIndexedPages,
      lastSyncAt: p.lastSyncAt,
      createdAt: p.createdAt,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { propertyId: string; repoId: string | null };
  const { propertyId, repoId } = body;

  if (!propertyId) {
    return NextResponse.json({ success: false, error: "propertyId is required" }, { status: 400 });
  }

  const property = await prisma.gscProperty.findFirst({
    where: { id: propertyId, userId: session.user.id },
  });

  if (!property) {
    return NextResponse.json({ success: false, error: "Property not found" }, { status: 404 });
  }

  if (repoId) {
    const repo = await prisma.repo.findFirst({ where: { id: repoId, userId: session.user.id } });
    if (!repo) {
      return NextResponse.json({ success: false, error: "Repo not found" }, { status: 404 });
    }
  }

  const updated = await prisma.gscProperty.update({
    where: { id: propertyId },
    data: { repoId: repoId ?? null },
    select: { id: true, siteUrl: true, repoId: true },
  });

  return NextResponse.json({ success: true, data: updated });
}
