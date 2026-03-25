export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const collaborator = await prisma.collaborator.findFirst({
      where: { id, invitedById: session.user.id },
    });

    if (!collaborator) {
      return NextResponse.json(
        { success: false, error: "Collaborator not found" },
        { status: 404 }
      );
    }

    await prisma.collaborator.update({
      where: { id },
      data: { status: "REVOKED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revoke collaborator error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
