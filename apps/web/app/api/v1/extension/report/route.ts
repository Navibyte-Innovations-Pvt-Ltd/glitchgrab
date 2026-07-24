export const dynamic = "force-dynamic";

// Creates a GitHub issue directly from the extension's own "Report Bug" UI
// (#297) — the shared @glitchgrab/report-ui dialog, same one the SDK uses.
// Auth: the ExtensionSession id from auto-login. repoId is verified against
// that session's ALLOWED repos (tester's assignments, or the dashboard
// owner's full list) before anything is created — never trust the
// client-supplied repoId directly (see the earlier IDOR on the sibling
// .../session/[id]/repo route for why).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createGitHubIssue } from "@/lib/github";
import { getInstallationAccessToken } from "@/lib/github-app";
import { uploadScreenshotToS3 } from "@/lib/s3";
import { getExtensionSessionIdentity, getExtensionSessionRepos } from "@/lib/extension-session";

function deriveTitle(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Bug report";
  const firstSentence = trimmed.split(/[.!?\n]/)[0].trim();
  const candidate = firstSentence.length > 0 && firstSentence.length <= 80 ? firstSentence : trimmed;
  if (candidate.length <= 80) return candidate;
  return candidate.slice(0, 77).replace(/\s\S*$/, "") + "...";
}

interface ExtensionReportBody {
  sessionId?: string;
  repoId?: string;
  type?: string;
  description?: string;
  metadata?: { screenshots?: string; severity?: string };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ExtensionReportBody;
    if (!body.sessionId || !body.repoId) {
      return NextResponse.json({ success: false, error: "sessionId and repoId required" }, { status: 400 });
    }
    if (!body.description?.trim() && !body.metadata?.screenshots) {
      return NextResponse.json({ success: false, error: "Provide a description or screenshot" }, { status: 400 });
    }

    const identity = await getExtensionSessionIdentity(body.sessionId);
    if (!identity) {
      return NextResponse.json({ success: false, error: "Session not found or ended" }, { status: 401 });
    }

    const allowedRepos = await getExtensionSessionRepos(identity);
    if (!allowedRepos.some((r) => r.id === body.repoId)) {
      return NextResponse.json({ success: false, error: "Repo not assigned to you" }, { status: 403 });
    }

    const repo = await prisma.repo.findUnique({
      where: { id: body.repoId },
      include: { installation: { select: { installationId: true } } },
    });
    if (!repo?.installation) {
      return NextResponse.json(
        { success: false, error: "GitHub App not installed on this repo — ask the owner to reconnect" },
        { status: 400 }
      );
    }

    const installationToken = await getInstallationAccessToken(repo.installation.installationId);

    let screenshots: string[] = [];
    if (body.metadata?.screenshots) {
      try {
        const parsed = JSON.parse(body.metadata.screenshots);
        if (Array.isArray(parsed)) screenshots = parsed.filter((s) => typeof s === "string");
      } catch { /* ignore malformed */ }
    }

    const report = await prisma.report.create({
      data: {
        repoId: repo.id,
        source: "EXTENSION_TESTER",
        status: "PENDING",
        rawInput: body.description || null,
        reporterPrimaryKey: identity.testerEmail ?? identity.testerName,
        reporterName: identity.testerName,
        reporterEmail: identity.testerEmail,
        metadata: body.metadata?.severity ? { severity: body.metadata.severity } : undefined,
      },
    });

    const title = deriveTitle(body.description || "Bug report");
    let issueBody = body.description?.trim() || "_(No description provided)_";

    if (screenshots.length > 0) {
      const refs: string[] = [];
      for (let i = 0; i < screenshots.length; i++) {
        const url = await uploadScreenshotToS3(screenshots[i], `${report.id}${i > 0 ? `-${i + 1}` : ""}`);
        if (url) refs.push(`![Screenshot${screenshots.length > 1 ? ` ${i + 1}` : ""}](${url})`);
      }
      if (refs.length > 0) {
        issueBody += `\n\n## Screenshot${refs.length > 1 ? "s" : ""}\n\n${refs.join("\n\n")}`;
      }
    }

    issueBody += `\n\n---\n> **Reported by:** ${identity.testerName}${identity.testerEmail ? ` (${identity.testerEmail})` : ""} • **Created:** ${report.createdAt.toISOString()}\n\n*Reported via [Glitchgrab](https://glitchgrab.dev) extension*`;

    const severityValue = body.metadata?.severity;
    const typeToLabel: Record<string, string> = {
      BUG: "bug",
      FEATURE_REQUEST: "enhancement",
      UI_IMPROVEMENT: "ui",
      PERFORMANCE: "performance",
      SECURITY: "security",
      QUESTION: "question",
      OTHER: "feedback",
    };
    const labels = [typeToLabel[body.type ?? "BUG"] ?? "bug", ...(severityValue ? [`severity:${severityValue}`] : [])];

    try {
      const createdIssue = await createGitHubIssue(installationToken, {
        owner: repo.owner,
        repo: repo.name,
        title,
        body: issueBody,
        labels,
      });

      await prisma.issue.create({
        data: {
          reportId: report.id,
          repoId: repo.id,
          githubNumber: createdIssue.number,
          githubUrl: createdIssue.url,
          title,
          body: issueBody,
          labels,
          severity: severityValue ?? "medium",
        },
      });

      await prisma.report.update({ where: { id: report.id }, data: { status: "CREATED" } });

      return NextResponse.json({
        success: true,
        data: { reportId: report.id, intent: "create", issueUrl: createdIssue.url, issueNumber: createdIssue.number, title },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.report.update({ where: { id: report.id }, data: { status: "FAILED", failReason: message } });
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  } catch (error) {
    console.error("Extension report error:", error);
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
