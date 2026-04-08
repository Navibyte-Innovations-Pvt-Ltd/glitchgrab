export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { processReport } from "@/lib/pipeline";
import { createGitHubIssue } from "@/lib/github";
import { uploadScreenshotToS3 } from "@/lib/s3";
import { dispatchWebhook } from "@/lib/webhooks";
import { checkRateLimit } from "@/lib/rate-limit";

interface SdkReportBody {
  source: "SDK_AUTO" | "SDK_USER_REPORT";
  type?: "BUG" | "FEATURE_REQUEST" | "QUESTION" | "OTHER";
  description?: string;
  errorMessage?: string;
  errorStack?: string;
  componentStack?: string;
  pageUrl?: string;
  userAgent?: string;
  breadcrumbs?: { type: string; message: string; timestamp: string; data?: Record<string, string> }[];
  deviceInfo?: Record<string, unknown>;
  metadata?: Record<string, string>;
}

export async function POST(request: Request) {
  try {
    // 1. Validate token from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer gg_")) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing API token" },
        { status: 401 }
      );
    }

    const plainToken = authHeader.replace("Bearer ", "");
    const tokenHash = hashToken(plainToken);

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

    // 2. Rate limit check
    const rateLimit = checkRateLimit(tokenHash);
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil(
        (rateLimit.resetAt.getTime() - Date.now()) / 1000
      );
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
            "Retry-After": String(retryAfter),
          },
        }
      );
    }

    // 3. Update last used
    await prisma.apiToken.update({
      where: { id: apiToken.id },
      data: { lastUsed: new Date() },
    });

    const rateLimitHeaders = {
      "X-RateLimit-Remaining": String(rateLimit.remaining),
      "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
    };

    // 4. Parse body
    const body = (await request.json()) as SdkReportBody;

    const description = [
      body.errorMessage && `**Error:** ${body.errorMessage}`,
      body.description,
      body.componentStack && `**Component Stack:**\n\`\`\`\n${body.componentStack}\n\`\`\``,
      body.breadcrumbs?.length && `**Breadcrumbs (last ${body.breadcrumbs.length}):**\n${body.breadcrumbs.map((b) => `- [${b.type}] ${b.message}`).join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    // Merge device info + metadata
    const enrichedMetadata = {
      ...body.metadata,
      ...(body.deviceInfo
        ? Object.fromEntries(
            Object.entries(body.deviceInfo).map(([k, v]) => [`device_${k}`, String(v)])
          )
        : {}),
      ...(body.type ? { reportType: body.type } : {}),
    };

    // 5. Create report
    const report = await prisma.report.create({
      data: {
        repoId: apiToken.repoId,
        tokenId: apiToken.id,
        source: body.source === "SDK_USER_REPORT" ? "SDK_USER_REPORT" : "SDK_AUTO",
        status: "PENDING",
        rawInput: description || null,
        errorStack: body.errorStack || null,
        pageUrl: body.pageUrl || null,
        userAgent: body.userAgent || null,
        metadata: JSON.parse(JSON.stringify(enrichedMetadata)),
        reporterPrimaryKey: body.metadata?.sessionUserId || "unknown",
        reporterName: body.metadata?.sessionUserName || "Unknown",
        reporterEmail: body.metadata?.sessionUserEmail || null,
        reporterPhone: body.metadata?.sessionUserPhone || null,
      },
    });

    // 6. SDK_USER_REPORT — create GitHub issue directly (no AI)
    if (body.source === "SDK_USER_REPORT") {
      const account = await prisma.account.findFirst({
        where: { userId: apiToken.repo.userId, provider: "github" },
      });

      if (!account?.access_token) {
        return NextResponse.json(
          { success: false, error: "GitHub access token not found" },
          { status: 500, headers: rateLimitHeaders }
        );
      }

      // Map type → label and title prefix
      const typeToLabel: Record<string, string> = {
        BUG: "bug",
        FEATURE_REQUEST: "enhancement",
        QUESTION: "question",
        OTHER: "feedback",
      };
      const reportTypeKey = body.type ?? "BUG";
      const typeLabel = typeToLabel[reportTypeKey] ?? "bug";
      const severityValue = body.metadata?.severity;
      const labels = [typeLabel, ...(severityValue ? [`severity:${severityValue}`] : [])];

      const titlePrefix = reportTypeKey === "FEATURE_REQUEST" ? "[Feature] "
        : reportTypeKey === "QUESTION" ? "[Question] "
        : reportTypeKey === "OTHER" ? "[Feedback] "
        : "";

      const rawTitle = body.description
        ? body.description.slice(0, 80) + (body.description.length > 80 ? "..." : "")
        : body.errorMessage
          ? body.errorMessage.slice(0, 80)
          : "Bug report via SDK";
      const title = titlePrefix + rawTitle;

      let issueBody = "";
      if (body.description) issueBody += `## Description\n\n${body.description}\n\n`;
      if (body.errorMessage) issueBody += `## Error\n\n\`${body.errorMessage}\`\n\n`;
      if (body.errorStack) issueBody += `## Stack Trace\n\n\`\`\`\n${body.errorStack}\n\`\`\`\n\n`;

      // Environment info
      const envLines: string[] = [];
      if (body.pageUrl) envLines.push(`**Page:** ${body.pageUrl}`);
      if (body.userAgent) envLines.push(`**User Agent:** ${body.userAgent}`);
      if (body.deviceInfo) {
        const d = body.deviceInfo;
        if (d.screenWidth && d.screenHeight) envLines.push(`**Screen:** ${d.screenWidth}x${d.screenHeight}`);
        if (d.viewportWidth && d.viewportHeight) envLines.push(`**Viewport:** ${d.viewportWidth}x${d.viewportHeight}`);
        if (d.platform) envLines.push(`**Platform:** ${d.platform}`);
        if (d.language) envLines.push(`**Language:** ${d.language}`);
        if (d.colorScheme) envLines.push(`**Color Scheme:** ${d.colorScheme}`);
      }
      if (envLines.length > 0) issueBody += `## Environment\n\n${envLines.join("\n")}\n\n`;

      // Page navigation history
      const visitedPages = body.metadata?.visitedPages;
      if (visitedPages) {
        try {
          const pages: string[] = JSON.parse(visitedPages);
          if (pages.length > 0) {
            issueBody += `## Page History\n\n${pages.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\n`;
          }
        } catch {
          // invalid JSON, skip
        }
      }

      // Breadcrumbs (user actions before report)
      if (body.breadcrumbs && body.breadcrumbs.length > 0) {
        const crumbs = body.breadcrumbs.slice(-15).map((b) => {
          const time = new Date(b.timestamp).toLocaleTimeString("en-US", { hour12: false });
          return `| ${time} | ${b.type} | ${b.message} |`;
        });
        issueBody += `## Activity Log\n\n| Time | Type | Event |\n|------|------|-------|\n${crumbs.join("\n")}\n\n`;
      }

      // Upload screenshot to S3
      const screenshotData = body.metadata?.screenshot;
      if (screenshotData && typeof screenshotData === "string" && screenshotData.startsWith("data:image/")) {
        const screenshotUrl = await uploadScreenshotToS3(screenshotData, report.id);
        if (screenshotUrl) {
          issueBody += `\n\n## Screenshot\n\n![Screenshot](${screenshotUrl})`;
        }
      }

      // Reported by (session info from host app)
      const sessionUserId = body.metadata?.sessionUserId;
      const sessionUserName = body.metadata?.sessionUserName;
      const sessionUserEmail = body.metadata?.sessionUserEmail;
      const sessionUserPhone = body.metadata?.sessionUserPhone;
      const reporterParts: string[] = [];
      if (sessionUserName) reporterParts.push(sessionUserName);
      if (sessionUserEmail) reporterParts.push(`(${sessionUserEmail})`);
      if (sessionUserPhone) reporterParts.push(`📞 ${sessionUserPhone}`);
      if (sessionUserId) reporterParts.push(`• ID: \`${sessionUserId}\``);

      if (reporterParts.length > 0) {
        issueBody += `\n\n---\n> **Reported by:** ${reporterParts.join(" ")}`;
        issueBody += "\n\n*Reported via [Glitchgrab](https://glitchgrab.dev) SDK*";
      } else {
        issueBody += "\n\n---\n*Reported via [Glitchgrab](https://glitchgrab.dev) SDK*";
      }

      const createdIssue = await createGitHubIssue(account.access_token, {
        owner: apiToken.repo.owner,
        repo: apiToken.repo.name,
        title,
        body: issueBody,
        labels,
      });

      // Save Issue record
      await prisma.issue.create({
        data: {
          reportId: report.id,
          repoId: apiToken.repoId,
          githubNumber: createdIssue.number,
          githubUrl: createdIssue.url,
          title,
          body: issueBody,
          labels,
          severity: severityValue ?? "medium",
        },
      });

      await prisma.report.update({
        where: { id: report.id },
        data: { status: "CREATED" },
      });

      dispatchWebhook(apiToken.repo.userId, "issue.created", {
        issueUrl: createdIssue.url,
        issueNumber: createdIssue.number,
        title,
        labels,
        severity: severityValue ?? "medium",
        repo: apiToken.repo.fullName,
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            reportId: report.id,
            intent: "create",
            issueUrl: createdIssue.url,
            issueNumber: createdIssue.number,
            title,
          },
        },
        { headers: rateLimitHeaders }
      );
    }

    // Auto-capture — process async, respond immediately
    processReport(report.id).catch((err) =>
      console.error("SDK auto-capture pipeline error:", err)
    );

    return NextResponse.json(
      {
        success: true,
        data: { reportId: report.id, status: "PROCESSING" },
      },
      { headers: rateLimitHeaders }
    );
  } catch (error) {
    console.error("SDK report error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
