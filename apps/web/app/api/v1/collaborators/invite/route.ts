export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/tokens";
import { sendCollaboratorInvite } from "@/lib/mail";

interface InviteBody {
  email: string;
  repoIds: string[];
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as InviteBody;
    const { email, repoIds } = body;

    if (!email || !repoIds?.length) {
      return NextResponse.json(
        { success: false, error: "Email and at least one repo are required" },
        { status: 400 }
      );
    }

    // Verify all repos belong to this user
    const repos = await prisma.repo.findMany({
      where: { id: { in: repoIds }, userId: session.user.id },
    });

    if (repos.length !== repoIds.length) {
      return NextResponse.json(
        { success: false, error: "One or more repos not found" },
        { status: 404 }
      );
    }

    // Check for existing active invite
    const existing = await prisma.collaborator.findUnique({
      where: {
        email_invitedById: { email, invitedById: session.user.id },
      },
    });

    if (existing && existing.status !== "REVOKED") {
      return NextResponse.json(
        { success: false, error: "This email has already been invited" },
        { status: 409 }
      );
    }

    // Generate magic link token
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    if (existing && existing.status === "REVOKED") {
      // Re-invite: update existing record
      await prisma.collaborator.update({
        where: { id: existing.id },
        data: {
          tokenHash,
          status: "PENDING",
          expiresAt,
          lastActiveAt: null,
        },
      });

      // Remove old repo access and add new
      await prisma.collaboratorRepo.deleteMany({
        where: { collaboratorId: existing.id },
      });
      await prisma.collaboratorRepo.createMany({
        data: repoIds.map((repoId) => ({
          collaboratorId: existing.id,
          repoId,
        })),
      });
    } else {
      // Create new collaborator
      await prisma.collaborator.create({
        data: {
          email,
          invitedById: session.user.id,
          tokenHash,
          expiresAt,
          repos: {
            create: repoIds.map((repoId) => ({ repoId })),
          },
        },
      });
    }

    // Build magic link
    const baseUrl = process.env.NEXTAUTH_URL || "https://glitchgrab.dev";
    const magicLink = `${baseUrl}/collaborate/accept?token=${rawToken}`;

    // Send invite email
    await sendCollaboratorInvite(
      email,
      session.user.name || "A Glitchgrab user",
      magicLink,
      repos.map((r) => r.fullName)
    );

    return NextResponse.json({
      success: true,
      data: { email, repoCount: repoIds.length },
    });
  } catch (error) {
    console.error("Invite collaborator error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
