export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/v1/extensions/connections — which Google accounts are connected.
 *
 * The page needs this before anything else: with none connected the only
 * sensible thing to show is the Connect button, not an add form that will be
 * refused.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const connections = await prisma.storeConnection.findMany({
    where: { userId },
    // Never the refresh token. It is as sensitive as the store access itself
    // and nothing on the client has any use for it.
    select: { id: true, googleEmail: true, lastError: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    success: true,
    data: connections.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
  });
}
