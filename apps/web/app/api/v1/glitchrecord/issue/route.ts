export const dynamic = "force-dynamic";

// Dedicated issue-creation endpoint for the GlitchRecord desktop app.
// Auth: Bearer GlitchRecordToken. Body: { repoId, title, body, testerName?, testerEmail? }.
// testerName/testerEmail (#297) are pure attribution — when present, also
// write a Report+Issue row tagged source=EXTENSION_TESTER alongside the
// GitHub issue, so the tester's work shows up in the Reports/audit views.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { createGitHubIssue } from "@/lib/github";
import { getInstallationAccessToken } from "@/lib/github-app";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers: CORS });
    }
    const tokenHash = hashToken(authHeader.replace("Bearer ", ""));
    const record = await prisma.glitchRecordToken.findUnique({
      where: { tokenHash },
      select: { userId: true, expiresAt: true },
    });
    if (!record || record.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: "Invalid or expired token" }, { status: 401, headers: CORS });
    }
    const userId = record.userId;

    const body = await request.json().catch(() => ({})) as {
      repoId?: string;
      title?: string;
      body?: string;
      testerName?: string;
      testerEmail?: string;
    };
    if (!body.repoId || !body.title) {
      return NextResponse.json({ success: false, error: "repoId and title required" }, { status: 400, headers: CORS });
    }

    const repo = await prisma.repo.findFirst({
      where: { id: body.repoId, userId },
      select: {
        owner: true,
        name: true,
        fullName: true,
        installation: { select: { installationId: true } },
      },
    });
    if (!repo) {
      return NextResponse.json({ success: false, error: "Repo not found" }, { status: 404, headers: CORS });
    }

    if (!repo.installation) {
      return NextResponse.json(
        {
          success: false,
          error: "GitHub App not installed on this repo — reconnect in Connect Repo to grant access",
        },
        { status: 400, headers: CORS }
      );
    }

    const installationToken = await getInstallationAccessToken(repo.installation.installationId);

    const issue = await createGitHubIssue(installationToken, {
      owner: repo.owner,
      repo: repo.name,
      title: body.title,
      body: body.body ?? "",
      labels: ["glitchrecord"],
    });

    if (body.testerName?.trim()) {
      const report = await prisma.report.create({
        data: {
          repoId: body.repoId,
          source: "EXTENSION_TESTER",
          status: "CREATED",
          rawInput: body.body ?? null,
          reporterPrimaryKey: body.testerEmail?.trim() || body.testerName.trim(),
          reporterName: body.testerName.trim(),
          reporterEmail: body.testerEmail?.trim() || null,
        },
      });
      await prisma.issue.create({
        data: {
          reportId: report.id,
          repoId: body.repoId,
          githubNumber: issue.number,
          githubUrl: issue.url,
          title: body.title,
          body: body.body ?? "",
          labels: ["glitchrecord"],
          severity: "medium",
        },
      });
    }

    return NextResponse.json(
      { success: true, data: { issueUrl: issue.url, issueNumber: issue.number } },
      { headers: CORS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: CORS });
  }
}
