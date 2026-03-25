export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const collaborators = await prisma.collaborator.findMany({
      where: { invitedById: session.user.id },
      include: {
        repos: {
          include: { repo: { select: { id: true, fullName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: collaborators.map((c) => ({
        id: c.id,
        email: c.email,
        status: c.status,
        lastActiveAt: c.lastActiveAt,
        createdAt: c.createdAt,
        expiresAt: c.expiresAt,
        repos: c.repos.map((cr) => ({
          id: cr.repo.id,
          fullName: cr.repo.fullName,
        })),
      })),
    });
  } catch (error) {
    console.error("List collaborators error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
