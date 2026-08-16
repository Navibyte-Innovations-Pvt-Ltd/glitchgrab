export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getContextTimeline, getContextRepos } from "@/lib/project-context/queries";

/**
 * GET /api/v1/project-context
 *
 * The per-project memory timeline (#311 Phase A). Session auth.
 *
 * Scope is server-authoritative: `getContextTimeline` resolves the caller's
 * repos through `lib/repo-access` (owner OR explicit RepoMember grant — org
 * membership grants nothing). A `?repoId=` outside that set returns an empty
 * list rather than a 403, so the response never confirms a repo exists.
 *
 * Query params:
 *   ?repoId=xxx  — scope to one project
 *   ?limit=100   — max items (default/max 300)
 *   ?repos=1     — return the accessible repo list + counts instead of items
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);

    if (url.searchParams.get("repos")) {
      const repos = await getContextRepos(userId);
      return NextResponse.json({ success: true, data: repos });
    }

    const repoId = url.searchParams.get("repoId");
    const limitParam = Number(url.searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined;

    const items = await getContextTimeline({ userId, repoId, limit });

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error("Project context fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
