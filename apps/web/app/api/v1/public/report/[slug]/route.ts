export const dynamic = "force-dynamic";

import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createGitHubIssue } from "@/lib/github";
import { checkRateLimit } from "@/lib/rate-limit";

interface PublicReportBody {
  name?: string;
  email?: string;
  phone?: string;
  description: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = (await request.json()) as PublicReportBody;

    if (!body.description?.trim()) {
      return NextResponse.json(
        { success: false, error: "Description is required" },
        { status: 400 }
      );
    }

    const apiToken = await prisma.apiToken.findUnique({
      where: { shareSlug: slug },
      include: { repo: true },
    });

    if (!apiToken) {
      return NextResponse.json(
        { success: false, error: "Link not found or revoked" },
        { status: 404 }
      );
    }

    const rateLimit = await checkRateLimit(`public-report:${slug}`, 20, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many reports via this link — try again later" },
        { status: 429 }
      );
    }

    const account = await prisma.account.findFirst({
      where: { userId: apiToken.repo.userId, provider: "github" },
    });

    if (!account?.access_token) {
      return NextResponse.json(
        { success: false, error: "GitHub access token not found" },
        { status: 500 }
      );
    }

    const name = body.name?.trim();
    const email = body.email?.trim();
    const phone = body.phone?.trim();

    const report = await prisma.report.create({
      data: {
        repoId: apiToken.repoId,
        tokenId: apiToken.id,
        source: "PUBLIC_LINK",
        status: "PENDING",
        rawInput: body.description.trim(),
        reporterPrimaryKey: email || phone || randomUUID(),
        reporterName: name || "Anonymous tester",
        reporterEmail: email || null,
        reporterPhone: phone || null,
      },
    });

    const title = body.description.trim().slice(0, 80) + (body.description.trim().length > 80 ? "..." : "");

    let issueBody = `## Description\n\n${body.description.trim()}\n\n`;

    const reporterParts: string[] = [];
    if (name) reporterParts.push(name);
    if (email) reporterParts.push(`(${email})`);
    if (phone) reporterParts.push(`📞 ${phone}`);
    issueBody += reporterParts.length > 0
      ? `\n\n---\n> **Reported by:** ${reporterParts.join(" ")}`
      : "\n\n---\n> **Reported by:** Anonymous tester";
    issueBody += "\n\n*Reported via [Glitchgrab](https://glitchgrab.dev) share link*";

    try {
      const createdIssue = await createGitHubIssue(account.access_token, {
        owner: apiToken.repo.owner,
        repo: apiToken.repo.name,
        title,
        body: issueBody,
        labels: ["bug"],
      });

      await prisma.issue.create({
        data: {
          reportId: report.id,
          repoId: apiToken.repoId,
          githubNumber: createdIssue.number,
          githubUrl: createdIssue.url,
          title,
          body: issueBody,
          labels: ["bug"],
          severity: "medium",
        },
      });

      await prisma.report.update({
        where: { id: report.id },
        data: { status: "CREATED" },
      });

      return NextResponse.json({
        success: true,
        data: { issueUrl: createdIssue.url, issueNumber: createdIssue.number },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.report.update({
        where: { id: report.id },
        data: { status: "FAILED", failReason: message },
      });
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Public report error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
