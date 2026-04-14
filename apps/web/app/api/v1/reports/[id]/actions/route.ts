export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

/**
 * POST /api/v1/reports/[id]/actions
 *
 * Perform actions on a report's GitHub issue.
 * Auth: session (dashboard) OR Bearer gg_ token (SDK)
 *
 * Actions: close, reopen, label, unlabel
 * Body: { action: "close" | "reopen" | "label" | "unlabel", label?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth: session OR token
    let repoOwnerId: string | null = null;

    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer gg_")) {
      const tokenHash = hashToken(authHeader.replace("Bearer ", ""));
      const apiToken = await prisma.apiToken.findUnique({
        where: { tokenHash },
        include: { repo: true },
      });
      if (!apiToken) {
        return NextResponse.json(
          { success: false, error: "Invalid API token" },
          { status: 401 }
        );
      }
      repoOwnerId = apiToken.repo.userId;
    } else {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
      repoOwnerId = session.user.id;
    }

    const { id } = await params;
    const body = await request.json();
    const { action, label } = body as { action: string; label?: string };

    // Fetch report with issue and repo
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        repo: true,
        issue: true,
      },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: "Report not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (report.repo.userId !== repoOwnerId) {
      return NextResponse.json(
        { success: false, error: "Not authorized" },
        { status: 403 }
      );
    }

    if (action === "dismiss") {
      const existingMetadata = (report.metadata as Record<string, unknown>) ?? {};
      await prisma.report.update({
        where: { id },
        data: { metadata: { ...existingMetadata, dismissed: true } },
      });
      return NextResponse.json({ success: true, data: { action: "dismissed" } });
    }

    if (!report.issue) {
      return NextResponse.json(
        { success: false, error: "No GitHub issue linked to this report" },
        { status: 400 }
      );
    }

    // Get GitHub access token
    const account = await prisma.account.findFirst({
      where: { userId: report.repo.userId, provider: "github" },
    });

    if (!account?.access_token) {
      return NextResponse.json(
        { success: false, error: "GitHub access token not found" },
        { status: 500 }
      );
    }

    const ghHeaders = {
      Authorization: `Bearer ${account.access_token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    };
    const issueUrl = `https://api.github.com/repos/${report.repo.owner}/${report.repo.name}/issues/${report.issue.githubNumber}`;

    if (action === "close") {
      const res = await fetch(issueUrl, {
        method: "PATCH",
        headers: ghHeaders,
        body: JSON.stringify({ state: "closed" }),
      });
      if (!res.ok) {
        return NextResponse.json(
          { success: false, error: `GitHub API error: ${res.status}` },
          { status: 502 }
        );
      }
      return NextResponse.json({ success: true, data: { action: "closed" } });
    }

    if (action === "reopen") {
      const res = await fetch(issueUrl, {
        method: "PATCH",
        headers: ghHeaders,
        body: JSON.stringify({ state: "open" }),
      });
      if (!res.ok) {
        return NextResponse.json(
          { success: false, error: `GitHub API error: ${res.status}` },
          { status: 502 }
        );
      }
      return NextResponse.json({ success: true, data: { action: "reopened" } });
    }

    if (action === "label" && label) {
      const res = await fetch(`${issueUrl}/labels`, {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({ labels: [label] }),
      });
      if (!res.ok) {
        return NextResponse.json(
          { success: false, error: `GitHub API error: ${res.status}` },
          { status: 502 }
        );
      }
      return NextResponse.json({ success: true, data: { action: "labeled", label } });
    }

    if (action === "unlabel" && label) {
      const res = await fetch(`${issueUrl}/labels/${encodeURIComponent(label)}`, {
        method: "DELETE",
        headers: ghHeaders,
      });
      if (!res.ok && res.status !== 404) {
        return NextResponse.json(
          { success: false, error: `GitHub API error: ${res.status}` },
          { status: 502 }
        );
      }
      return NextResponse.json({ success: true, data: { action: "unlabeled", label } });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Report action error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
