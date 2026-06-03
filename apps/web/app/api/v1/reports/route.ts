export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createGitHubIssue } from "@/lib/github";
import { uploadScreenshotToS3 } from "@/lib/s3";
import { dispatchWebhook } from "@/lib/webhooks";
import sharp from "sharp";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const repos = await prisma.repo.findMany({ where: { userId }, select: { id: true } });
    const repoIds = repos.map((r: { id: string }) => r.id);

    if (repoIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const reports = await prisma.report.findMany({
      where: { repoId: { in: repoIds } },
      include: {
        repo: { select: { id: true, fullName: true, userId: true, owner: true, name: true } },
        issue: { select: { githubNumber: true, githubUrl: true, title: true, labels: true, severity: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Fetch GitHub issue states
    const issueStates: Record<string, string> = {};
    if (userId) {
      const account = await prisma.account.findFirst({
        where: { userId, provider: "github" },
        select: { access_token: true },
      });
      if (account?.access_token) {
        const issuesByRepo = new Map<string, number[]>();
        for (const r of reports) {
          if (r.issue) {
            const key = r.repo.fullName;
            const existing = issuesByRepo.get(key) ?? [];
            existing.push(r.issue.githubNumber);
            issuesByRepo.set(key, existing);
          }
        }
        await Promise.all(
          Array.from(issuesByRepo.entries()).map(async ([fullName, numbers]) => {
            try {
              const res = await fetch(
                `https://api.github.com/repos/${fullName}/issues?state=all&per_page=100`,
                { headers: { Authorization: `Bearer ${account.access_token}` } }
              );
              if (res.ok) {
                const issues = (await res.json()) as { number: number; state: string }[];
                for (const issue of issues) {
                  if (numbers.includes(issue.number)) {
                    issueStates[`${fullName}#${issue.number}`] = issue.state;
                  }
                }
              }
            } catch { /* skip */ }
          })
        );
      }
    }

    const data = reports.map((r: typeof reports[number]) => ({
      id: r.id,
      source: r.source,
      status: r.status,
      rawInput: r.rawInput,
      failReason: r.failReason,
      createdAt: r.createdAt,
      repoId: r.repoId,
      repoFullName: r.repo.fullName,
      dismissed: (r.metadata as Record<string, unknown>)?.dismissed === true,
      reporterPrimaryKey: r.reporterPrimaryKey,
      reporterName: r.reporterName,
      reporterEmail: r.reporterEmail,
      issue: r.issue
        ? {
            githubNumber: r.issue.githubNumber,
            githubUrl: r.issue.githubUrl,
            title: r.issue.title,
            labels: r.issue.labels,
            severity: r.issue.severity,
            githubState: issueStates[`${r.repo.fullName}#${r.issue.githubNumber}`] ?? null,
          }
        : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Fetch reports error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────

/** Derive a concise GitHub issue title from the user's raw text */
function deriveTitle(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Bug report";
  // Use first sentence if short, otherwise truncate at word boundary
  const firstSentence = trimmed.split(/[.!?\n]/)[0].trim();
  const candidate = firstSentence.length > 0 && firstSentence.length <= 80 ? firstSentence : trimmed;
  if (candidate.length <= 80) return candidate;
  return candidate.slice(0, 77).replace(/\s\S*$/, "") + "...";
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const repoId = (formData.getAll("repoId").at(0) ?? "") as string;
    const description = ((formData.getAll("description").at(0) ?? "") as string).trim();
    const screenshotFiles = formData.getAll("screenshot") as unknown as File[];

    if (!repoId) {
      return NextResponse.json(
        { success: false, error: "Repo is required" },
        { status: 400 }
      );
    }

    if (!description && screenshotFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: "Provide a description or screenshot" },
        { status: 400 }
      );
    }

    const repo = await prisma.repo.findFirst({
      where: { id: repoId, userId: session.user.id },
    });

    if (!repo) {
      return NextResponse.json(
        { success: false, error: "Repo not found" },
        { status: 404 }
      );
    }

    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "github" },
    });

    if (!account?.access_token) {
      return NextResponse.json(
        { success: false, error: "GitHub account not connected" },
        { status: 400 }
      );
    }

    // Resize all screenshots
    const screenshotDataUrls: string[] = [];
    for (const file of screenshotFiles) {
      if (!(file instanceof File) || file.size === 0) continue;
      const buffer = Buffer.from(await file.arrayBuffer());
      const resized = await sharp(buffer)
        .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      const base64 = resized.toString("base64");
      screenshotDataUrls.push(`data:image/jpeg;base64,${base64}`);
    }

    const primaryScreenshot = screenshotDataUrls[0] ?? null;
    const metadata: Record<string, unknown> = {};
    if (screenshotDataUrls.length > 1) {
      metadata.extraScreenshots = screenshotDataUrls.slice(1);
    }

    // Create report record (no AI status — direct to CREATED after issue is made)
    const report = await prisma.report.create({
      data: {
        repoId: repo.id,
        source: "DASHBOARD_UPLOAD",
        status: "PENDING",
        rawInput: description || null,
        screenshot: primaryScreenshot,
        reporterPrimaryKey: session.user.id,
        reporterName: session.user.name ?? "Unknown",
        reporterEmail: session.user.email ?? null,
        metadata: Object.keys(metadata).length > 0
          ? JSON.parse(JSON.stringify(metadata))
          : undefined,
      },
    });

    // Build issue body directly from user input (no AI)
    const title = deriveTitle(description || "Bug report");
    let issueBody = description || "_(No description provided)_";

    // Upload screenshots to S3 and append to body
    if (screenshotDataUrls.length > 0) {
      const refs: string[] = [];
      for (let i = 0; i < screenshotDataUrls.length; i++) {
        const url = await uploadScreenshotToS3(
          screenshotDataUrls[i],
          `${report.id}${i > 0 ? `-${i + 1}` : ""}`
        );
        if (url) {
          refs.push(`![Screenshot${screenshotDataUrls.length > 1 ? ` ${i + 1}` : ""}](${url})`);
        }
      }
      if (refs.length > 0) {
        issueBody += `\n\n## Screenshot${refs.length > 1 ? "s" : ""}\n\n${refs.join("\n\n")}`;
      }
    }

    // Reporter footer
    const reporterParts: string[] = [];
    if (session.user.name) reporterParts.push(session.user.name);
    if (session.user.email) reporterParts.push(`(${session.user.email})`);
    if (reporterParts.length > 0) {
      issueBody += `\n\n---\n> **Reported by:** ${reporterParts.join(" ")}\n\n*Reported via [Glitchgrab](https://glitchgrab.dev)*`;
    } else {
      issueBody += "\n\n---\n*Reported via [Glitchgrab](https://glitchgrab.dev)*";
    }

    try {
      const createdIssue = await createGitHubIssue(account.access_token, {
        owner: repo.owner,
        repo: repo.name,
        title,
        body: issueBody,
        labels: [],
      });

      await prisma.issue.create({
        data: {
          reportId: report.id,
          repoId: repo.id,
          githubNumber: createdIssue.number,
          githubUrl: createdIssue.url,
          title,
          body: issueBody,
          labels: [],
          severity: "medium",
        },
      });

      await prisma.report.update({
        where: { id: report.id },
        data: { status: "CREATED" },
      });

      dispatchWebhook(repo.userId, "issue.created", {
        issueUrl: createdIssue.url,
        issueNumber: createdIssue.number,
        title,
        labels: [],
        severity: "medium",
        repo: repo.fullName,
      });

      return NextResponse.json({
        success: true,
        data: {
          reportId: report.id,
          intent: "create",
          issueUrl: createdIssue.url,
          issueNumber: createdIssue.number,
          title,
          status: "CREATED",
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.report.update({
        where: { id: report.id },
        data: { status: "FAILED", failReason: message },
      });
      return NextResponse.json(
        {
          success: false,
          error: message,
          data: { reportId: report.id, status: "FAILED" },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
