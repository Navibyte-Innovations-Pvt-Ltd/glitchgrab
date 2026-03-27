export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processReport } from "@/lib/pipeline";
import { getCollabSession } from "@/lib/collab-auth";
import sharp from "sharp";

export async function GET() {
  try {
    const session = await auth();
    const collabSession = await getCollabSession();
    const userId = session?.user?.id;

    if (!userId && !collabSession) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const repoIds: string[] = [];
    if (userId) {
      const repos = await prisma.repo.findMany({ where: { userId }, select: { id: true } });
      repoIds.push(...repos.map((r) => r.id));
    }
    if (collabSession) {
      const collabRepos = await prisma.collaboratorRepo.findMany({
        where: { collaborator: { id: collabSession.collaboratorId, status: "ACCEPTED" } },
        select: { repoId: true },
      });
      repoIds.push(...collabRepos.map((r) => r.repoId));
    }

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

    const data = reports.map((r) => ({
      id: r.id,
      source: r.source,
      status: r.status,
      rawInput: r.rawInput,
      failReason: r.failReason,
      createdAt: r.createdAt,
      repoId: r.repoId,
      repoFullName: r.repo.fullName,
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

export async function POST(request: Request) {
  try {
    const session = await auth();
    const collabSession = await getCollabSession();

    if (!session?.user?.id && !collabSession) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const repoId = formData.get("repoId") as string;
    const description = formData.get("description") as string;
    const screenshotFiles = formData.getAll("screenshot") as File[];
    const chatHistoryRaw = formData.get("chatHistory") as string | null;

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

    // Verify repo access — check own repos first, then shared repos
    let repo;
    let collaboratorEmail: string | null = null;

    if (session?.user?.id) {
      repo = await prisma.repo.findFirst({
        where: { id: repoId, userId: session.user.id },
      });
    }

    // If not found as own repo, check shared repos via collab session
    if (!repo && collabSession) {
      const collabRepo = await prisma.collaboratorRepo.findFirst({
        where: {
          repoId,
          collaborator: {
            id: collabSession.collaboratorId,
            status: "ACCEPTED",
          },
        },
        include: { repo: true },
      });
      repo = collabRepo?.repo ?? null;
      collaboratorEmail = collabSession.email;
    }

    if (!repo) {
      return NextResponse.json(
        { success: false, error: "Repo not found" },
        { status: 404 }
      );
    }

    // Convert all screenshots to base64 data URLs — resize to max 1024px for AI + storage
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

    // Store first screenshot in report.screenshot (primary — used by AI and pipeline)
    // Store all as JSON array in report.metadata for multi-screenshot support
    const primaryScreenshot = screenshotDataUrls[0] ?? null;

    // Build metadata
    const metadata: Record<string, unknown> = {};
    if (screenshotDataUrls.length > 1) {
      metadata.extraScreenshots = screenshotDataUrls.slice(1);
    }
    if (collaboratorEmail) {
      metadata.collaboratorEmail = collaboratorEmail;
    }

    // Create the report
    const report = await prisma.report.create({
      data: {
        repoId: repo.id,
        collaboratorId: collabSession?.collaboratorId ?? null,
        source: collaboratorEmail ? "COLLABORATOR" : "DASHBOARD_UPLOAD",
        status: "PENDING",
        rawInput: description || null,
        screenshot: primaryScreenshot,
        reporterPrimaryKey: session?.user?.id ?? collabSession?.collaboratorId ?? "unknown",
        reporterName: session?.user?.name ?? collaboratorEmail ?? "Unknown",
        reporterEmail: session?.user?.email ?? collaboratorEmail ?? null,
        metadata: Object.keys(metadata).length > 0
          ? JSON.parse(JSON.stringify(metadata))
          : undefined,
      },
    });

    // Parse chat history if provided (last 5 messages for context)
    let chatHistory: { role: "user" | "assistant"; content: string }[] | undefined;
    if (chatHistoryRaw) {
      try {
        chatHistory = JSON.parse(chatHistoryRaw);
      } catch {
        // Ignore invalid chat history
      }
    }

    // Process with AI pipeline
    const result = await processReport(report.id, chatHistory);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error ?? "Pipeline failed",
          data: { reportId: report.id, status: "FAILED" },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        reportId: report.id,
        intent: result.intent,
        issueUrl: result.issueUrl,
        issueNumber: result.issueNumber,
        title: result.title,
        message: result.message,
        clarifyQuestions: result.clarifyQuestions,
        status: "CREATED",
      },
    });
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
