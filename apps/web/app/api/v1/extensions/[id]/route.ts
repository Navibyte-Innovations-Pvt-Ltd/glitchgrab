export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

/** DELETE /api/v1/extensions/:id — stop watching, and forget the key. */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Scoped delete rather than findUnique-then-delete: one query, and no window
  // where the row is read as someone else's and deleted anyway.
  const { count } = await prisma.storeExtension.deleteMany({ where: { id, userId } });
  if (count === 0) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
