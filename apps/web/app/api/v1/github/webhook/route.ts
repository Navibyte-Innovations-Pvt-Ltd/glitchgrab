export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhooks";

/**
 * POST /api/v1/github/webhook
 *
 * Receives webhook events from GitHub when issues are commented on,
 * closed, reopened, or labeled. Forwards the event to the client's
 * registered webhook URL.
 *
 * Setup: In GitHub repo settings → Webhooks → Add webhook
 * - URL: https://glitchgrab.dev/api/v1/github/webhook
 * - Content type: application/json
 * - Events: Issues, Issue comments
 */
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const event = request.headers.get("x-github-event");

    if (!event) {
      return NextResponse.json({ error: "Missing event header" }, { status: 400 });
    }

    const payload = JSON.parse(body) as {
      action: string;
      issue?: {
        number: number;
        title: string;
        html_url: string;
        state: string;
        body: string | null;
      };
      comment?: {
        body: string;
        user: { login: string; avatar_url: string };
        created_at: string;
      };
      repository: {
        full_name: string;
        owner: { login: string };
        name: string;
      };
    };

    const repoFullName = payload.repository.full_name;
    const issueNumber = payload.issue?.number;

    if (!issueNumber) {
      return NextResponse.json({ ok: true, skipped: "no issue" });
    }

    // Find the repo in our DB to get the user
    const repo = await prisma.repo.findFirst({
      where: { fullName: repoFullName },
      select: { userId: true, fullName: true },
    });

    if (!repo) {
      return NextResponse.json({ ok: true, skipped: "repo not tracked" });
    }

    // Find the linked Glitchgrab issue
    const glitchgrabIssue = await prisma.issue.findFirst({
      where: { repoId: repo.fullName, githubNumber: issueNumber },
    });

    // Handle different GitHub events
    if (event === "issues") {
      if (payload.action === "closed") {
        // Forward issue.closed to client
        dispatchWebhook(repo.userId, "issue.closed", {
          issueUrl: payload.issue?.html_url,
          issueNumber,
          title: payload.issue?.title,
          repoFullName,
          glitchgrabIssueId: glitchgrabIssue?.id,
        });
      }

      if (payload.action === "reopened") {
        dispatchWebhook(repo.userId, "issue.updated", {
          issueUrl: payload.issue?.html_url,
          issueNumber,
          title: payload.issue?.title,
          repoFullName,
          action: "reopened",
          glitchgrabIssueId: glitchgrabIssue?.id,
        });
      }

      if (payload.action === "labeled" || payload.action === "unlabeled") {
        dispatchWebhook(repo.userId, "issue.updated", {
          issueUrl: payload.issue?.html_url,
          issueNumber,
          title: payload.issue?.title,
          repoFullName,
          action: payload.action,
          glitchgrabIssueId: glitchgrabIssue?.id,
        });
      }
    }

    if (event === "issue_comment") {
      if (payload.action === "created" && payload.comment) {
        // Don't forward comments made by Glitchgrab itself
        if (payload.comment.body.includes("Reported via [Glitchgrab]") ||
            payload.comment.body.includes("Updated via [Glitchgrab]")) {
          return NextResponse.json({ ok: true, skipped: "self-comment" });
        }

        // Forward the developer's comment to client
        dispatchWebhook(repo.userId, "issue.commented", {
          issueUrl: payload.issue?.html_url,
          issueNumber,
          title: payload.issue?.title,
          repoFullName,
          comment: {
            body: payload.comment.body,
            author: payload.comment.user.login,
            authorAvatar: payload.comment.user.avatar_url,
            createdAt: payload.comment.created_at,
          },
          glitchgrabIssueId: glitchgrabIssue?.id,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("GitHub webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
