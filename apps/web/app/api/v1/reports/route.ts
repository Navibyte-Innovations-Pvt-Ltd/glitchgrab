export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processReport } from "@/lib/pipeline";
import sharp from "sharp";

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
    const repoId = formData.get("repoId") as string;
    const description = formData.get("description") as string;
    const screenshotFile = formData.get("screenshot") as File | null;

    if (!repoId) {
      return NextResponse.json(
        { success: false, error: "Repo is required" },
        { status: 400 }
      );
    }

    if (!description && !screenshotFile) {
      return NextResponse.json(
        { success: false, error: "Provide a description or screenshot" },
        { status: 400 }
      );
    }

    // Verify repo belongs to user
    const repo = await prisma.repo.findFirst({
      where: { id: repoId, userId: session.user.id },
    });

    if (!repo) {
      return NextResponse.json(
        { success: false, error: "Repo not found" },
        { status: 404 }
      );
    }

    // Convert screenshot to base64 data URL — resize to max 1024px for AI + storage
    let screenshotDataUrl: string | null = null;
    if (screenshotFile) {
      const buffer = Buffer.from(await screenshotFile.arrayBuffer());
      const resized = await sharp(buffer)
        .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      const base64 = resized.toString("base64");
      screenshotDataUrl = `data:image/jpeg;base64,${base64}`;
    }

    // Create the report
    const report = await prisma.report.create({
      data: {
        repoId: repo.id,
        source: "DASHBOARD_UPLOAD",
        status: "PENDING",
        rawInput: description || null,
        screenshot: screenshotDataUrl,
      },
    });

    // Process with AI pipeline
    const result = await processReport(report.id);

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
