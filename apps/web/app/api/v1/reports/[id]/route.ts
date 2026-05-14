export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const report = await prisma.report.findUnique({
      where: { id },
      include: { repo: true, issue: true },
    });

    if (!report || report.repo.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "Report not found" },
        { status: 404 }
      );
    }

    if (!report.issue) {
      return NextResponse.json({
        success: true,
        data: {
          id: report.id,
          source: report.source,
          status: report.status,
          rawInput: report.rawInput,
          reporterPrimaryKey: report.reporterPrimaryKey,
          reporterName: report.reporterName,
          reporterEmail: report.reporterEmail,
          createdAt: report.createdAt,
          issue: null,
          comments: [],
        },
      });
    }

    // Fetch GitHub issue details + comments
    const account = await prisma.account.findFirst({
      where: { userId: report.repo.userId, provider: "github" },
      select: { access_token: true },
    });

    if (!account?.access_token) {
      return NextResponse.json(
        { success: false, error: "GitHub access token not found" },
        { status: 500 }
      );
    }

    const ghHeaders = {
      Authorization: `Bearer ${account.access_token}`,
      Accept: "application/vnd.github+json",
    };

    const issueUrl = `https://api.github.com/repos/${report.repo.owner}/${report.repo.name}/issues/${report.issue.githubNumber}`;

    const [issueRes, commentsRes] = await Promise.all([
      fetch(issueUrl, { headers: ghHeaders }),
      fetch(`${issueUrl}/comments?per_page=100`, { headers: ghHeaders }),
    ]);

    let githubState = null;
    let githubLabels: string[] = [];
    let issueBody = report.issue.body;

    if (issueRes.ok) {
      const issueData = await issueRes.json();
      githubState = issueData.state;
      githubLabels = (issueData.labels ?? []).map((l: { name: string }) => l.name);
      issueBody = issueData.body ?? report.issue.body;
    }

    let comments: { author: string; body: string; createdAt: string }[] = [];
    if (commentsRes.ok) {
      const commentsData = await commentsRes.json();
      comments = commentsData.map(
        (c: { user: { login: string }; body: string; created_at: string }) => ({
          author: c.user.login,
          body: c.body,
          createdAt: c.created_at,
        })
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: report.id,
        source: report.source,
        status: report.status,
        rawInput: report.rawInput,
        reporterPrimaryKey: report.reporterPrimaryKey,
        reporterName: report.reporterName,
        reporterEmail: report.reporterEmail,
        createdAt: report.createdAt,
        issue: {
          githubNumber: report.issue.githubNumber,
          githubUrl: report.issue.githubUrl,
          title: report.issue.title,
          body: issueBody,
          labels: githubLabels,
          severity: report.issue.severity,
          githubState,
        },
        comments,
      },
    });
  } catch (error) {
    console.error("Report detail error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
