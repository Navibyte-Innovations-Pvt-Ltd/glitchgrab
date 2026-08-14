export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * PATCH /api/v1/feedback/[id]
 *
 * Owner moderation — flips `approved`, which is what gates an entry from being
 * served publicly through `GET /api/v1/sdk/feedback?approved=true`.
 *
 * Body: { approved: boolean }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as { approved?: boolean };

    if (typeof body.approved !== "boolean") {
      return NextResponse.json(
        { success: false, error: "approved must be a boolean" },
        { status: 400 }
      );
    }

    const existing = await prisma.feedback.findUnique({
      where: { id },
      select: { id: true, repo: { select: { userId: true } } },
    });

    if (!existing || existing.repo.userId !== userId) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.feedback.update({
      where: { id },
      data: { approved: body.approved },
      select: { id: true, approved: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Feedback update error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/feedback/[id] — owner removes an entry entirely.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.feedback.findUnique({
      where: { id },
      select: { id: true, repo: { select: { userId: true } } },
    });

    if (!existing || existing.repo.userId !== userId) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    await prisma.feedback.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Feedback delete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
