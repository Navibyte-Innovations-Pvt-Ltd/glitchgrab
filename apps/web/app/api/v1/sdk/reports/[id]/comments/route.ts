export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

/**
 * POST /api/v1/sdk/reports/[id]/comments
 *
 * Add a comment to the GitHub issue linked to this report.
 * The comment includes reporter attribution from the session.
 *
 * Auth: Bearer gg_ token
 * Body: { message: string, reporterName?: string, reporterEmail?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer gg_")) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing API token" },
        { status: 401 }
      );
    }

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

    const { id } = await params;
    const body = await request.json();
    const { message, reporterName, reporterEmail } = body as {
      message: string;
      reporterName?: string;
      reporterEmail?: string;
    };

    if (!message?.trim()) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    const report = await prisma.report.findUnique({
      where: { id },
      include: { repo: true, issue: true },
    });

    if (!report || report.repoId !== apiToken.repoId) {
      return NextResponse.json(
        { success: false, error: "Report not found" },
        { status: 404 }
      );
    }

    if (!report.issue) {
      return NextResponse.json(
        { success: false, error: "No GitHub issue linked to this report" },
        { status: 400 }
      );
    }

    const account = await prisma.account.findFirst({
      where: { userId: report.repo.userId, provider: "github" },
      select: { access_token: true },
    });

    if (!account?.access_token) {
      return NextResponse.json(
        { success: false, error: "GitHub access token not found" },
        { status: 500 }
      );
    }

    // Build comment with reporter attribution
    const name = reporterName || report.reporterName || "Unknown";
    const email = reporterEmail || report.reporterEmail;
    const attribution = email ? `**${name}** (${email})` : `**${name}**`;

    const commentBody = `${message.trim()}\n\n---\n> Commented by: ${attribution}\n\n*via [Glitchgrab](https://glitchgrab.dev)*`;

    const res = await fetch(
      `https://api.github.com/repos/${report.repo.owner}/${report.repo.name}/issues/${report.issue.githubNumber}/comments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: commentBody }),
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `GitHub API error: ${res.status}` },
        { status: 502 }
      );
    }

    const comment = await res.json();

    return NextResponse.json({
      success: true,
      data: {
        author: comment.user.login,
        body: comment.body,
        createdAt: comment.created_at,
        htmlUrl: comment.html_url,
      },
    });
  } catch (error) {
    console.error("SDK report comment error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
