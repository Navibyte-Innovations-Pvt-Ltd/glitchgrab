export const dynamic = "force-dynamic";

// Dedicated issue-creation endpoint for the GlitchRecord desktop app.
// Auth: Bearer GlitchRecordToken. Body: { repoId, title, body }.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { createGitHubIssue } from "@/lib/github";

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
    };
    if (!body.repoId || !body.title) {
      return NextResponse.json({ success: false, error: "repoId and title required" }, { status: 400, headers: CORS });
    }

    const repo = await prisma.repo.findFirst({
      where: { id: body.repoId, userId },
      select: { owner: true, name: true, fullName: true },
    });
    if (!repo) {
      return NextResponse.json({ success: false, error: "Repo not found" }, { status: 404, headers: CORS });
    }

    const account = await prisma.account.findFirst({
      where: { userId, provider: "github" },
      select: { access_token: true },
    });
    if (!account?.access_token) {
      return NextResponse.json({ success: false, error: "GitHub not connected" }, { status: 400, headers: CORS });
    }

    const issue = await createGitHubIssue(account.access_token, {
      owner: repo.owner,
      repo: repo.name,
      title: body.title,
      body: body.body ?? "",
      labels: ["glitchrecord"],
    });

    return NextResponse.json(
      { success: true, data: { issueUrl: issue.url, issueNumber: issue.number } },
      { headers: CORS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: CORS });
  }
}
