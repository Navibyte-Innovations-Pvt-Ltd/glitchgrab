export const dynamic = "force-dynamic";

/**
 * PATCH /api/v1/repos/[id]/ai-assist — turn the report assistant on or off (#330).
 *
 * Owner only, and deliberately not delegated to repo members: this switch
 * spends model budget on behalf of whoever owns the project, including on
 * strangers who open the report dialog inside an SDK-embedded app. A
 * collaborator can read the project; they cannot commit its owner to a bill.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { enabled?: unknown };
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "enabled must be a boolean" },
        { status: 400 }
      );
    }

    // Scoped update rather than findUnique-then-update: a repo the caller does
    // not own must be indistinguishable from a repo that does not exist.
    const result = await prisma.repo.updateMany({
      where: { id, userId: session.user.id },
      data: { aiAssistEnabled: body.enabled },
    });
    if (result.count === 0) {
      return NextResponse.json({ success: false, error: "Repo not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { aiAssistEnabled: body.enabled } });
  } catch (error) {
    console.error("AI assist toggle error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
