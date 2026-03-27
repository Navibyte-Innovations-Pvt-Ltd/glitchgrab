export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

/**
 * GET /api/v1/sdk/reports
 *
 * Fetch reports for a repo using the API token.
 * Returns reports with GitHub issue state (open/closed), reporter info, and metadata.
 *
 * Headers:
 *   Authorization: Bearer gg_xxxxx
 *
 * Query params:
 *   ?reporterPrimaryKey=user_123   — filter by reporter's primary key
 *   ?status=CREATED                — filter by status (PENDING, PROCESSING, CREATED, FAILED)
 *   ?limit=20                      — max results (default 50, max 100)
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer gg_")) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing API token" },
        { status: 401 }
      );
    }

    const plainToken = authHeader.replace("Bearer ", "");
    const tokenHash = hashToken(plainToken);

    const apiToken = await prisma.apiToken.findUnique({
      where: { tokenHash },
      include: { repo: true },
    });

    if (!apiToken) {
      return NextResponse.json(
        { success: false, error: "Invalid API token" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const reporterPrimaryKey = url.searchParams.get("reporterPrimaryKey");
    const status = url.searchParams.get("status");
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);

    const where: Record<string, unknown> = {
      repoId: apiToken.repoId,
    };

    if (reporterPrimaryKey) {
      where.reporterPrimaryKey = reporterPrimaryKey;
    }

    if (status) {
      where.status = status;
    }

    const reports = await prisma.report.findMany({
      where,
      select: {
        id: true,
        source: true,
        status: true,
        rawInput: true,
        reporterPrimaryKey: true,
        reporterName: true,
        reporterEmail: true,
        reporterPhone: true,
        pageUrl: true,
        createdAt: true,
        issue: {
          select: {
            githubNumber: true,
            githubUrl: true,
            title: true,
            labels: true,
            severity: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Fetch GitHub issue states
    const issueNumbers = reports
      .filter((r): r is typeof r & { issue: NonNullable<typeof r.issue> } => !!r.issue)
      .map((r) => r.issue.githubNumber);

    const issueStates: Record<number, string> = {};

    if (issueNumbers.length > 0) {
      const account = await prisma.account.findFirst({
        where: { userId: apiToken.repo.userId, provider: "github" },
        select: { access_token: true },
      });

      if (account?.access_token) {
        try {
          const res = await fetch(
            `https://api.github.com/repos/${apiToken.repo.owner}/${apiToken.repo.name}/issues?state=all&per_page=100`,
            { headers: { Authorization: `Bearer ${account.access_token}` } }
          );
          if (res.ok) {
            const issues = (await res.json()) as { number: number; state: string }[];
            for (const issue of issues) {
              if (issueNumbers.includes(issue.number)) {
                issueStates[issue.number] = issue.state;
              }
            }
          }
        } catch {
          // skip — return without states
        }
      }
    }

    const data = reports.map((r) => ({
      id: r.id,
      source: r.source,
      status: r.status,
      rawInput: r.rawInput,
      reporterPrimaryKey: r.reporterPrimaryKey,
      reporterName: r.reporterName,
      reporterEmail: r.reporterEmail,
      reporterPhone: r.reporterPhone,
      pageUrl: r.pageUrl,
      createdAt: r.createdAt,
      issue: r.issue
        ? {
            githubNumber: r.issue.githubNumber,
            githubUrl: r.issue.githubUrl,
            title: r.issue.title,
            labels: r.issue.labels,
            severity: r.issue.severity,
            githubState: issueStates[r.issue.githubNumber] ?? null,
          }
        : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("SDK reports fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
