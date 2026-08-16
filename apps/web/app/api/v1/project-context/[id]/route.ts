export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteContextItem } from "@/lib/project-context/queries";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * DELETE /api/v1/project-context/:id
 *
 * Remove a distilled item the model got wrong. Scoped through
 * `lib/repo-access` — an item on a repo the caller can't read answers 404, the
 * same as one that doesn't exist.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const deleted = await deleteContextItem(userId, id);

    if (!deleted) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Project context delete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
