import { prisma } from "@/lib/db";
import { generateIssueFromBug, type AiIssueOutput } from "@/lib/ai";
import { createGitHubIssue } from "@/lib/github";

// ─── Types ──────────────────────────────────────────────

export interface PipelineResult {
  success: boolean;
  issueUrl?: string;
  issueNumber?: number;
  title?: string;
  error?: string;
}

// ─── Pipeline ───────────────────────────────────────────

export async function processReport(reportId: string): Promise<PipelineResult> {
  try {
    // 1. Mark as PROCESSING
    const report = await prisma.report.update({
      where: { id: reportId },
      data: { status: "PROCESSING" },
      include: {
        repo: true,
      },
    });

    // 2. Get the user's GitHub access token
    const account = await prisma.account.findFirst({
      where: { userId: report.repo.userId, provider: "github" },
    });

    if (!account?.access_token) {
      throw new Error(
        "GitHub account not connected or access token missing"
      );
    }

    // 3. Call AI to generate issue content
    const aiResult: AiIssueOutput = await generateIssueFromBug({
      description: report.rawInput ?? "Bug report (no description provided)",
      screenshotUrl: report.screenshot,
      errorStack: report.errorStack,
      pageUrl: report.pageUrl,
      userAgent: report.userAgent,
    });

    // 4. Store AI response on the report
    await prisma.report.update({
      where: { id: reportId },
      data: { aiResponse: JSON.parse(JSON.stringify(aiResult)) },
    });

    // 5. Create the GitHub issue
    const createdIssue = await createGitHubIssue(account.access_token, {
      owner: report.repo.owner,
      repo: report.repo.name,
      title: aiResult.title,
      body: aiResult.body,
      labels: aiResult.labels,
    });

    // 6. Save Issue record in DB
    await prisma.issue.create({
      data: {
        reportId: report.id,
        repoId: report.repo.id,
        githubNumber: createdIssue.number,
        githubUrl: createdIssue.url,
        title: aiResult.title,
        body: aiResult.body,
        labels: aiResult.labels,
        severity: aiResult.severity,
      },
    });

    // 7. Mark report as CREATED
    await prisma.report.update({
      where: { id: reportId },
      data: { status: "CREATED" },
    });

    return {
      success: true,
      issueUrl: createdIssue.url,
      issueNumber: createdIssue.number,
      title: aiResult.title,
    };
  } catch (error) {
    // Mark report as FAILED with reason
    const failReason =
      error instanceof Error ? error.message : "Unknown pipeline error";

    await prisma.report
      .update({
        where: { id: reportId },
        data: { status: "FAILED", failReason },
      })
      .catch((updateErr) => {
        // If even the status update fails, log it but don't mask the original error
        console.error("Failed to update report status:", updateErr);
      });

    return {
      success: false,
      error: failReason,
    };
  }
}
