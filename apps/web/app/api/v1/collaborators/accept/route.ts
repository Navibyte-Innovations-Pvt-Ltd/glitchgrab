export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { createCollabToken, getCollabCookieName } from "@/lib/collab-auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawToken = searchParams.get("token");

    if (!rawToken) {
      return NextResponse.json(
        { success: false, error: "Missing token" },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(rawToken);

    const collaborator = await prisma.collaborator.findUnique({
      where: { tokenHash },
      include: { invitedBy: { select: { id: true, name: true } } },
    });

    if (!collaborator) {
      return NextResponse.json(
        { success: false, error: "Invalid invitation link" },
        { status: 404 }
      );
    }

    if (collaborator.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "This invitation has expired" },
        { status: 410 }
      );
    }

    // Mark as accepted
    await prisma.collaborator.update({
      where: { id: collaborator.id },
      data: {
        status: "ACCEPTED",
        lastActiveAt: new Date(),
      },
    });

    // Create session token
    const sessionToken = createCollabToken({
      collaboratorId: collaborator.id,
      email: collaborator.email,
      ownerId: collaborator.invitedById,
    });

    // Redirect to collaborate page with session cookie
    const baseUrl = process.env.NEXTAUTH_URL || "https://glitchgrab.dev";
    const response = NextResponse.redirect(`${baseUrl}/dashboard`);

    response.cookies.set(getCollabCookieName(), sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Accept collaborator error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
