export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processReport } from "@/lib/pipeline";
import { getCollabSession } from "@/lib/collab-auth";
import sharp from "sharp";

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
