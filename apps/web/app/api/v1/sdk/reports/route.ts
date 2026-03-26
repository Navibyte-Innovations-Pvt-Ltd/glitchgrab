export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

/**
 * GET /api/v1/sdk/reports
 *
 * Fetch reports for a repo using the API token.
 * Supports filtering by reporterPrimaryKey to find reports by a specific user.
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
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error("SDK reports fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
