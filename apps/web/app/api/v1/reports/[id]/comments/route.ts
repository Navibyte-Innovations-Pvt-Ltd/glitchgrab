export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCollabSession } from "@/lib/collab-auth";

/**
 * POST /api/v1/reports/[id]/comments
 *
 * Add a comment to the GitHub issue linked to this report.
 * Auth: session (dashboard owner) or collab session
 * Body: { message: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const collabSession = await getCollabSession();
    const userId = session?.user?.id;

    if (!userId && !collabSession) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { message } = body as { message: string };

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

    if (!report) {
      return NextResponse.json(
        { success: false, error: "Report not found" },
        { status: 404 }
      );
    }

    // Verify access and determine commenter identity
    let authorized = false;
    let commenterName = "Unknown";
    let commenterEmail: string | null = null;

    if (userId && report.repo.userId === userId) {
      authorized = true;
      commenterName = session?.user?.name ?? "Unknown";
      commenterEmail = session?.user?.email ?? null;
    }
    if (!authorized && collabSession) {
      const collabRepo = await prisma.collaboratorRepo.findFirst({
        where: {
          repoId: report.repoId,
          collaborator: { id: collabSession.collaboratorId, status: "ACCEPTED" },
        },
      });
      if (collabRepo) {
        authorized = true;
        commenterName = collabSession.email;
        commenterEmail = collabSession.email;
      }
    }

    if (!authorized) {
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

    const attribution = commenterEmail
      ? `**${commenterName}** (${commenterEmail})`
      : `**${commenterName}**`;

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
    console.error("Report comment error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
