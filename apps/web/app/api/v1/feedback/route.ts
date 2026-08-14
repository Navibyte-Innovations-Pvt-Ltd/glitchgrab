export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/v1/feedback
 *
 * Dashboard view of end-user feedback (#309) across every repo the signed-in
 * user owns. Session auth — the SDK-facing counterpart is /api/v1/sdk/feedback.
 *
 * Query params:
 *   ?repoId=xxx     — scope to one repo (still verified against ownership)
 *   ?limit=100      — max results (default 200, max 200)
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const repos = await prisma.repo.findMany({
      where: { userId },
      select: { id: true, fullName: true },
    });

    if (repos.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const url = new URL(request.url);
    const repoIdParam = url.searchParams.get("repoId");
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 200) || 200, 200);

    // Intersect the requested repo with the owned set — never trust the param alone.
    const ownedRepoIds = repos.map((r: { id: string }) => r.id);
    const repoIds = repoIdParam
      ? ownedRepoIds.filter((id: string) => id === repoIdParam)
      : ownedRepoIds;

    if (repoIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const repoNames = new Map(repos.map((r: { id: string; fullName: string }) => [r.id, r.fullName]));

    const feedback = await prisma.feedback.findMany({
      where: { repoId: { in: repoIds } },
      select: {
        id: true,
        repoId: true,
        rating: true,
        message: true,
        pageUrl: true,
        approved: true,
        reporterPrimaryKey: true,
        reporterName: true,
        reporterEmail: true,
        reporterPhone: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const data = feedback.map((f: (typeof feedback)[number]) => ({
      ...f,
      repoFullName: repoNames.get(f.repoId) ?? "",
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Feedback fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
