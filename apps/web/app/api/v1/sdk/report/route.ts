export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { createGitHubIssue } from "@/lib/github";
import { getInstallationAccessToken } from "@/lib/github-app";
import { uploadScreenshotToS3 } from "@/lib/s3";
import { uploadDocumentsToRepo, buildAttachmentsSection } from "@/lib/attachments";
import {
  MAX_DOCUMENT_SIZE,
  MAX_ATTACHMENTS_PER_REPORT,
  isAllowedDocumentFile,
} from "@/lib/attachments-constants";
import { dispatchWebhook } from "@/lib/webhooks";
import { checkRateLimit } from "@/lib/rate-limit";
import { computeReportSignature, DEDUP_WINDOW_MS, OPEN_ISSUE_WINDOW_MS } from "@/lib/signature";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/;

function isLocalhostRequest(request: Request, body: SdkReportBody): boolean {
  if (body.pageUrl && LOCALHOST_RE.test(body.pageUrl)) return true;
  const origin = request.headers.get("origin") ?? "";
  const referer = request.headers.get("referer") ?? "";
  return LOCALHOST_RE.test(origin) || LOCALHOST_RE.test(referer);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

interface SdkReportBody {
  source: "SDK_AUTO" | "SDK_USER_REPORT";
  type?:
    | "BUG"
    | "FEATURE_REQUEST"
    | "UI_IMPROVEMENT"
    | "PERFORMANCE"
    | "SECURITY"
    | "QUESTION"
    | "OTHER";
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
    const body = (await request.json()) as SdkReportBody;

    if (isLocalhostRequest(request, body)) {
      return NextResponse.json(
        {
          success: true,
          data: {
            message: "Development mode — report received but GitHub issue not created. Deploy to production for full functionality.",
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    // Validate token
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer gg_")) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing API token" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const plainToken = authHeader.replace("Bearer ", "");
    const tokenHash = hashToken(plainToken);

    const apiToken = await prisma.apiToken.findUnique({
      where: { tokenHash },
      include: {
        repo: { include: { installation: { select: { installationId: true } } } },
      },
    });

    if (!apiToken) {
      return NextResponse.json(
        { success: false, error: "Invalid API token" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // Rate limit check
    const rateLimit = await checkRateLimit(tokenHash);
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil(
        (rateLimit.resetAt.getTime() - Date.now()) / 1000
      );
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded", retryAfter },
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
            "Retry-After": String(retryAfter),
          },
        }
      );
    }

    await prisma.apiToken.update({
      where: { id: apiToken.id },
      data: { lastUsed: new Date() },
    });

    const rateLimitHeaders = {
      ...CORS_HEADERS,
      "X-RateLimit-Remaining": String(rateLimit.remaining),
      "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
    };

    // Signature-based dedup for SDK_AUTO only — based on error fingerprint, NOT AI.
    const signature =
      body.source === "SDK_AUTO"
        ? computeReportSignature({
            errorMessage: body.errorMessage,
            pageUrl: body.pageUrl,
            errorStack: body.errorStack,
          })
        : null;

    if (body.source === "SDK_AUTO" && signature) {
      const recentDuplicate = await prisma.report.findFirst({
        where: {
          repoId: apiToken.repoId,
          signature,
          createdAt: { gte: new Date(Date.now() - DEDUP_WINDOW_MS) },
          status: { in: ["CREATED", "PROCESSING", "PENDING", "DUPLICATE"] },
        },
        orderBy: { createdAt: "desc" },
        include: { issue: true },
      });

      if (recentDuplicate) {
        return NextResponse.json(
          {
            success: true,
            data: {
              reportId: recentDuplicate.id,
              status: "DUPLICATE",
              issueUrl: recentDuplicate.issue?.githubUrl ?? null,
              issueNumber: recentDuplicate.issue?.githubNumber ?? null,
              message: "Duplicate of recent report — skipped",
            },
          },
          { headers: rateLimitHeaders }
        );
      }

      const openIssueDuplicate = await prisma.report.findFirst({
        where: {
          repoId: apiToken.repoId,
          signature,
          createdAt: { gte: new Date(Date.now() - OPEN_ISSUE_WINDOW_MS) },
          status: "CREATED",
          issue: { isNot: null },
        },
        orderBy: { createdAt: "desc" },
        include: { issue: true },
      });

      if (openIssueDuplicate) {
        return NextResponse.json(
          {
            success: true,
            data: {
              reportId: openIssueDuplicate.id,
              status: "DUPLICATE",
              issueUrl: openIssueDuplicate.issue?.githubUrl ?? null,
              issueNumber: openIssueDuplicate.issue?.githubNumber ?? null,
              message: "GitHub issue already exists for this error — skipped",
            },
          },
          { headers: rateLimitHeaders }
        );
      }
    }

    const description = [
      body.errorMessage && `**Error:** ${body.errorMessage}`,
      body.description,
      body.componentStack && `**Component Stack:**\n\`\`\`\n${body.componentStack}\n\`\`\``,
      body.breadcrumbs?.length && `**Breadcrumbs (last ${body.breadcrumbs.length}):**\n${body.breadcrumbs.map((b) => `- [${b.type}] ${b.message}`).join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const enrichedMetadata = {
      ...body.metadata,
      ...(body.deviceInfo
        ? Object.fromEntries(
            Object.entries(body.deviceInfo).map(([k, v]) => [`device_${k}`, String(v)])
          )
        : {}),
      ...(body.type ? { reportType: body.type } : {}),
    };

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
        signature,
        metadata: JSON.parse(JSON.stringify(enrichedMetadata)),
        reporterPrimaryKey: body.metadata?.sessionUserId || "unknown",
        reporterName: body.metadata?.sessionUserName || "Unknown",
        reporterEmail: body.metadata?.sessionUserEmail || null,
        reporterPhone: body.metadata?.sessionUserPhone || null,
      },
    });

    if (!apiToken.repo.installation) {
      const failReason = "GitHub App not installed on this repo — reconnect in Connect Repo to grant access";
      await prisma.report.update({
        where: { id: report.id },
        data: { status: "FAILED", failReason },
      });
      return NextResponse.json(
        { success: false, error: failReason },
        { status: 500, headers: rateLimitHeaders }
      );
    }

    const installationToken = await getInstallationAccessToken(
      apiToken.repo.installation.installationId
    );

    // Map type → label and title prefix (SDK_USER_REPORT explicitly provides type;
    // SDK_AUTO defaults to BUG).
    const reportTypeKey = body.type ?? "BUG";
    const typeToLabel: Record<string, string> = {
      BUG: "bug",
      FEATURE_REQUEST: "enhancement",
      UI_IMPROVEMENT: "ui",
      PERFORMANCE: "performance",
      SECURITY: "security",
      QUESTION: "question",
      OTHER: "feedback",
    };
    const typeLabel = typeToLabel[reportTypeKey] ?? "bug";
    const severityValue = body.metadata?.severity;
    const labels = [typeLabel, ...(severityValue ? [`severity:${severityValue}`] : [])];

    const titlePrefix = reportTypeKey === "FEATURE_REQUEST" ? "[Feature] "
      : reportTypeKey === "UI_IMPROVEMENT" ? "[UI] "
      : reportTypeKey === "PERFORMANCE" ? "[Performance] "
      : reportTypeKey === "SECURITY" ? "[Security] "
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

    if (body.breadcrumbs && body.breadcrumbs.length > 0) {
      const crumbs = body.breadcrumbs.slice(-15).map((b) => {
        const time = new Date(b.timestamp).toLocaleTimeString("en-US", { hour12: false });
        return `| ${time} | ${b.type} | ${b.message} |`;
      });
      issueBody += `## Activity Log\n\n| Time | Type | Event |\n|------|------|-------|\n${crumbs.join("\n")}\n\n`;
    }

    const screenshotsData: string[] = [];
    const screenshotsRaw = body.metadata?.screenshots;
    if (screenshotsRaw) {
      try {
        const parsed = JSON.parse(screenshotsRaw);
        if (Array.isArray(parsed)) {
          for (const s of parsed) {
            if (typeof s === "string" && s.startsWith("data:image/")) screenshotsData.push(s);
          }
        }
      } catch {
        // invalid JSON, skip
      }
    }
    // Back-compat with older SDK versions sending a single `screenshot` field
    const legacyScreenshot = body.metadata?.screenshot;
    if (legacyScreenshot && typeof legacyScreenshot === "string" && legacyScreenshot.startsWith("data:image/")) {
      screenshotsData.push(legacyScreenshot);
    }

    if (screenshotsData.length > 0) {
      const refs: string[] = [];
      for (let i = 0; i < screenshotsData.length; i++) {
        const url = await uploadScreenshotToS3(screenshotsData[i], report.id);
        if (url) refs.push(`![Screenshot${screenshotsData.length > 1 ? ` ${i + 1}` : ""}](${url})`);
      }
      if (refs.length > 0) {
        issueBody += `\n\n## Screenshot${refs.length > 1 ? "s" : ""}\n\n${refs.join("\n\n")}`;
      }
    }

    const attachmentsRaw = body.metadata?.attachments;
    if (attachmentsRaw) {
      try {
        const parsed = JSON.parse(attachmentsRaw);
        if (Array.isArray(parsed)) {
          const files: File[] = [];
          for (const item of parsed.slice(0, MAX_ATTACHMENTS_PER_REPORT)) {
            if (
              !item ||
              typeof item.name !== "string" ||
              typeof item.dataUrl !== "string"
            )
              continue;
            const match = item.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (!match) continue;
            // Reject oversized payloads by estimated size before paying the decode cost.
            const estimatedBytes = Math.floor(match[2].length * 0.75);
            if (estimatedBytes === 0 || estimatedBytes > MAX_DOCUMENT_SIZE) continue;
            const buffer = Buffer.from(match[2], "base64");
            if (buffer.length > MAX_DOCUMENT_SIZE) continue;
            const file = new File([buffer], item.name, { type: match[1] });
            if (file.size === 0) continue;
            if (!isAllowedDocumentFile(file)) continue;
            files.push(file);
          }
          if (files.length > 0) {
            const docs = await uploadDocumentsToRepo(
              installationToken,
              apiToken.repo.owner,
              apiToken.repo.name,
              report.id,
              files,
            );
            issueBody += buildAttachmentsSection(docs);
          }
        }
      } catch {
        // invalid JSON, skip
      }
    }

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
      issueBody += `\n\n---\n> **Reported by:** ${reporterParts.join(" ")} • **Created:** ${report.createdAt.toISOString()}`;
      issueBody += "\n\n*Reported via [Glitchgrab](https://glitchgrab.dev) SDK*";
    } else {
      issueBody += `\n\n---\n> **Created:** ${report.createdAt.toISOString()}\n\n*Reported via [Glitchgrab](https://glitchgrab.dev) SDK*`;
    }

    try {
      const createdIssue = await createGitHubIssue(installationToken, {
        owner: apiToken.repo.owner,
        repo: apiToken.repo.name,
        title,
        body: issueBody,
        labels,
      });

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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.report.update({
        where: { id: report.id },
        data: { status: "FAILED", failReason: message },
      });
      return NextResponse.json(
        { success: false, error: message, data: { reportId: report.id, status: "FAILED" } },
        { status: 500, headers: rateLimitHeaders }
      );
    }
  } catch (error) {
    console.error("SDK report error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
