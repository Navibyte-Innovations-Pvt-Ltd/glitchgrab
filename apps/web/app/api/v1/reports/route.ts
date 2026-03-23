export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

    // Create the report
    const report = await prisma.report.create({
      data: {
        repoId: repo.id,
        source: "DASHBOARD_UPLOAD",
        status: "PENDING",
        rawInput: description || null,
        screenshot: screenshotFile ? "pending_upload" : null,
      },
    });

    // TODO: Process with AI pipeline (normalize → enrich → dedup → generate → push to GitHub)
    // For now, return success with the report ID
    return NextResponse.json({
      success: true,
      data: {
        reportId: report.id,
        title: description?.slice(0, 80) || "Bug report from dashboard",
        status: "PENDING",
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
