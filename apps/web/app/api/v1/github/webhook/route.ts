export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhooks";
import { sendIssueResolvedWhatsApp, sendIssueAssignedNotification } from "@/lib/whatsapp";
import { getGitHubIssue } from "@/lib/github";
import { parseClosingIssueRefs } from "@/lib/qa";

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
      assignee?: { login: string };
      pull_request?: {
        number: number;
        title: string;
        html_url: string;
        body: string | null;
        merged: boolean;
        user: { login: string };
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

    // Pull request merged → fan out a QA check to each assigned tester
    if (event === "pull_request") {
      await handlePullRequestEvent(payload, repoFullName);
      return NextResponse.json({ ok: true });
    }

    const issueNumber = payload.issue?.number;

    if (!issueNumber) {
      return NextResponse.json({ ok: true, skipped: "no issue" });
    }

    // Find the repo in our DB to get the user
    const repo = await prisma.repo.findFirst({
      where: { fullName: repoFullName },
      select: { id: true, userId: true, fullName: true, orgId: true },
    });

    if (!repo) {
      return NextResponse.json({ ok: true, skipped: "repo not tracked" });
    }

    // Find the linked Glitchgrab issue + reporter details
    const glitchgrabIssue = await prisma.issue.findFirst({
      where: { repoId: repo.id, githubNumber: issueNumber },
      include: {
        report: { select: { reporterPhone: true, reporterName: true } },
      },
    });

    // Fetch repo owner + their org name for WA messages
    const repoOwnerData = await prisma.user.findUnique({
      where: { id: repo.userId },
      select: {
        name: true,
        whatsappPhone: true,
        ownedOrgs: { where: { id: repo.orgId ?? "" }, select: { name: true }, take: 1 },
      },
    });
    const orgName = repoOwnerData?.ownedOrgs?.[0]?.name ?? repoOwnerData?.name ?? "the team";

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

        // Notify reporter via WhatsApp if phone is available
        const phone = glitchgrabIssue?.report?.reporterPhone;
        const name = glitchgrabIssue?.report?.reporterName ?? "there";
        const rawTitle = payload.issue?.title ?? "your issue";
        // Prefix the GitHub issue number so the reporter can reference it.
        const title = `#${issueNumber} ${rawTitle}`;
        if (phone && glitchgrabIssue) {
          await sendIssueResolvedWhatsApp({
            phone,
            reporterName: name,
            issueTitle: title,
            orgName,
            developerPhone: repoOwnerData?.whatsappPhone,
            issueId: glitchgrabIssue.id,
          });
        }
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

      if (payload.action === "assigned" && payload.assignee?.login) {
        // Find the assignee in Glitchgrab by GitHub login
        const assigneeUser = await prisma.user.findFirst({
          where: { githubLogin: payload.assignee.login },
          select: { whatsappPhone: true, name: true },
        });

        if (assigneeUser?.whatsappPhone && payload.issue) {
          await sendIssueAssignedNotification({
            phone: assigneeUser.whatsappPhone,
            developerName: assigneeUser.name ?? payload.assignee.login,
            issueTitle: payload.issue.title,
            orgName,
            githubUrl: payload.issue.html_url,
          });
        }
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

/**
 * A merged PR often closes several issues at once ("Closes #12, fixes #14").
 * For each referenced issue, create a PENDING QaCheck for every tester assigned
 * to the repo. The WhatsApp verification request is NOT sent here — the fix
 * isn't actually live yet (Vercel deploy takes a few minutes after merge), so
 * /api/v1/cron/qa-notify sends it once the QaCheck is ~10min old.
 */
async function handlePullRequestEvent(
  payload: {
    action: string;
    pull_request?: {
      number: number;
      title: string;
      html_url: string;
      body: string | null;
      merged: boolean;
      user: { login: string };
    };
  },
  repoFullName: string
) {
  const pr = payload.pull_request;
  if (payload.action !== "closed" || !pr?.merged) return;

  // Parse both title and body for closing keywords
  const issueNumbers = parseClosingIssueRefs(`${pr.title}\n${pr.body ?? ""}`);
  if (issueNumbers.length === 0) return;

  const repo = await prisma.repo.findFirst({
    where: { fullName: repoFullName },
    select: { id: true, userId: true, owner: true, name: true, orgId: true },
  });
  if (!repo) return;

  // Testers assigned to this repo
  const testerRepos = await prisma.testerRepo.findMany({
    where: { repoId: repo.id },
    include: { tester: { select: { id: true, name: true, phone: true, magicToken: true } } },
  });
  if (testerRepos.length === 0) return;

  // Repo owner's GitHub token — used to fetch issue titles
  const account = await prisma.account.findFirst({
    where: { userId: repo.userId, provider: "github" },
    select: { access_token: true },
  });

  // Resolve each referenced issue's title/url once
  const issues = await Promise.all(
    issueNumbers.map(async (n) => {
      const gh = account?.access_token
        ? await getGitHubIssue(account.access_token, repo.owner, repo.name, n)
        : null;
      return {
        number: n,
        title: gh?.title ?? `Issue #${n}`,
        url: gh?.html_url ?? `https://github.com/${repoFullName}/issues/${n}`,
      };
    })
  );

  for (const tr of testerRepos) {
    const tester = tr.tester;

    for (const issue of issues) {
      try {
        await prisma.qaCheck.create({
          data: {
            testerId: tester.id,
            repoId: repo.id,
            githubNumber: issue.number,
            githubUrl: issue.url,
            title: issue.title,
            prNumber: pr.number,
            prUrl: pr.html_url,
            developerLogin: pr.user.login,
          },
        });
      } catch {
        // Unique constraint → this check already exists for this tester+PR+issue
      }
    }
  }
}
