import { prisma } from "@/lib/db";
import { classifyAndGenerate } from "@/lib/ai";
import {
  createGitHubIssue,
  uploadScreenshotToRepo,
  commentOnIssue,
  closeIssue,
  fetchOpenIssues,
} from "@/lib/github";

// ─── Types ──────────────────────────────────────────────

interface PipelineResult {
  success: boolean;
  intent: string;
  title?: string;
  issueUrl?: string;
  issueNumber?: number;
  message?: string;
  error?: string;
}

// ─── Pipeline ───────────────────────────────────────────

export async function processReport(reportId: string): Promise<PipelineResult> {
  try {
    // 1. Fetch the report with repo data
    const report = await prisma.report.findUniqueOrThrow({
      where: { id: reportId },
      include: { repo: true },
    });

    // 2. Update status to PROCESSING
    await prisma.report.update({
      where: { id: reportId },
      data: { status: "PROCESSING" },
    });

    // 3. Get the user's GitHub access token
    const account = await prisma.account.findFirst({
      where: { userId: report.repo.userId, provider: "github" },
    });

    if (!account?.access_token) {
      throw new Error("GitHub access token not found");
    }

    // 4. Fetch open issues for dedup context
    const openIssues = await fetchOpenIssues(
      account.access_token,
      report.repo.owner,
      report.repo.name
    );

    // 5. AI classifies intent and generates content
    const action = await classifyAndGenerate({
      description: report.rawInput ?? "",
      screenshotUrl: report.screenshot,
      errorStack: report.errorStack,
      pageUrl: report.pageUrl,
      userAgent: report.userAgent,
      openIssues,
    });

    // Store AI response
    await prisma.report.update({
      where: { id: reportId },
      data: { aiResponse: JSON.parse(JSON.stringify(action)) },
    });

    // 6. Execute based on intent
    if (action.intent === "create") {
      // Upload screenshot if provided
      let issueBody = action.body;
      if (report.screenshot?.startsWith("data:image/")) {
        const screenshotUrl = await uploadScreenshotToRepo(
          account.access_token,
          report.repo.owner,
          report.repo.name,
          report.screenshot,
          report.id
        );
        if (screenshotUrl) {
          issueBody += `\n\n## Screenshot\n\n![Screenshot](${screenshotUrl})`;
        }
      }
      issueBody += "\n\n---\n*Reported via [Glitchgrab](https://glitchgrab.dev)*";

      const createdIssue = await createGitHubIssue(account.access_token, {
        owner: report.repo.owner,
        repo: report.repo.name,
        title: action.title,
        body: issueBody,
        labels: action.labels,
      });

      // Save Issue record
      await prisma.issue.create({
        data: {
          reportId: report.id,
          repoId: report.repo.id,
          githubNumber: createdIssue.number,
          githubUrl: createdIssue.url,
          title: action.title,
          body: issueBody,
          labels: action.labels,
          severity: action.severity,
        },
      });

      await prisma.report.update({
        where: { id: reportId },
        data: { status: "CREATED" },
      });

      return {
        success: true,
        intent: "create",
        title: action.title,
        issueUrl: createdIssue.url,
        issueNumber: createdIssue.number,
      };
    }

    if (action.intent === "update") {
      let comment = action.comment;
      if (report.screenshot?.startsWith("data:image/")) {
        const screenshotUrl = await uploadScreenshotToRepo(
          account.access_token,
          report.repo.owner,
          report.repo.name,
          report.screenshot,
          report.id
        );
        if (screenshotUrl) {
          comment += `\n\n![Screenshot](${screenshotUrl})`;
        }
      }
      comment += "\n\n*Updated via [Glitchgrab](https://glitchgrab.dev)*";

      await commentOnIssue(
        account.access_token,
        report.repo.owner,
        report.repo.name,
        action.issueNumber,
        comment
      );

      await prisma.report.update({
        where: { id: reportId },
        data: { status: "CREATED" },
      });

      return {
        success: true,
        intent: "update",
        message: `Updated issue #${action.issueNumber} with additional context`,
        issueNumber: action.issueNumber,
        issueUrl: `https://github.com/${report.repo.fullName}/issues/${action.issueNumber}`,
      };
    }

    if (action.intent === "close") {
      for (const num of action.issueNumbers) {
        await closeIssue(
          account.access_token,
          report.repo.owner,
          report.repo.name,
          num,
          action.comment
        );
      }

      await prisma.report.update({
        where: { id: reportId },
        data: { status: "CREATED" },
      });

      const closed = action.issueNumbers.map((n) => `#${n}`).join(", ");
      return {
        success: true,
        intent: "close",
        message: `Closed ${action.issueNumbers.length === 1 ? "issue" : "issues"} ${closed}`,
      };
    }

    // Chat — no GitHub action needed
    await prisma.report.update({
      where: { id: reportId },
      data: { status: "CREATED" },
    });

    return {
      success: true,
      intent: "chat",
      message: action.message,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    try {
      await prisma.report.update({
        where: { id: reportId },
        data: { status: "FAILED", failReason: errorMessage },
      });
    } catch {
      // DB update failed — log but don't mask original error
    }
    return { success: false, intent: "error", error: errorMessage };
  }
}
