export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { grantRepoAccess, revokeRepoAccess } from "@/lib/repo-access";

/**
 * Context access grants (#311 Phase A) — the `RepoMember` rows that let someone
 * other than the repo owner read a project's context.
 *
 * Owner-only, all three verbs: a granted member cannot widen the circle
 * further. Ownership is implicit and never stored as a row, so the owner never
 * appears in the list this returns.
 *
 * GET    ?repoId=xxx        — who has been granted access
 * POST   { repoId, userId } — grant
 * DELETE ?repoId&userId     — revoke
 */

async function requireOwnedRepo(userId: string, repoId: string | null) {
  if (!repoId) return null;
  return prisma.repo.findFirst({
    where: { id: repoId, userId },
    select: { id: true },
  });
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const repoId = new URL(request.url).searchParams.get("repoId");
    const repo = await requireOwnedRepo(userId, repoId);
    if (!repo) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const members = await prisma.repoMember.findMany({
      where: { repoId: repo.id },
      select: {
        id: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Context access list error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const ownerId = session?.user?.id;
    if (!ownerId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      repoId?: string;
      userId?: string;
    };

    if (!body.repoId || !body.userId) {
      return NextResponse.json(
        { success: false, error: "repoId and userId required" },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const granted = await grantRepoAccess({
      ownerId,
      repoId: body.repoId,
      userId: body.userId,
    });
    if (!granted) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { repoId: body.repoId, userId: body.userId } });
  } catch (error) {
    console.error("Context access grant error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    const ownerId = session?.user?.id;
    if (!ownerId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const repoId = url.searchParams.get("repoId");
    const userId = url.searchParams.get("userId");

    if (!repoId || !userId) {
      return NextResponse.json(
        { success: false, error: "repoId and userId required" },
        { status: 400 }
      );
    }

    const revoked = await revokeRepoAccess({ ownerId, repoId, userId });
    if (!revoked) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { repoId, userId } });
  } catch (error) {
    console.error("Context access revoke error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
