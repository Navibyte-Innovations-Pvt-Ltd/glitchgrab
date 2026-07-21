export const dynamic = "force-dynamic";

import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createGitHubIssue } from "@/lib/github";
import { getInstallationAccessToken } from "@/lib/github-app";
import { checkRateLimit } from "@/lib/rate-limit";
import { uploadDocumentsToRepo, buildAttachmentsSection } from "@/lib/attachments";
import { MAX_DOCUMENT_SIZE, isAllowedDocumentFile } from "@/lib/attachments-constants";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const formData = await request.formData();
    const description = ((formData.getAll("description").at(0) ?? "") as string).trim();
    const name = ((formData.getAll("name").at(0) ?? "") as string).trim();
    const email = ((formData.getAll("email").at(0) ?? "") as string).trim();
    const phone = ((formData.getAll("phone").at(0) ?? "") as string).trim();
    const documentFiles = (formData.getAll("document") as unknown as File[]).filter(
      (f) => f instanceof File && f.size > 0
    );

    if (!description) {
      return NextResponse.json(
        { success: false, error: "Description is required" },
        { status: 400 }
      );
    }

    for (const file of documentFiles) {
      if (file.size > MAX_DOCUMENT_SIZE) {
        return NextResponse.json(
          { success: false, error: `${file.name} exceeds the 10MB limit` },
          { status: 400 }
        );
      }
      if (!isAllowedDocumentFile(file)) {
        return NextResponse.json(
          { success: false, error: `${file.name} must be a PDF, DOC, or DOCX file` },
          { status: 400 }
        );
      }
    }

    const apiToken = await prisma.apiToken.findUnique({
      where: { shareSlug: slug },
      include: {
        repo: { include: { installation: { select: { installationId: true } } } },
      },
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

    if (!apiToken.repo.installation) {
      return NextResponse.json(
        {
          success: false,
          error: "GitHub App not installed on this repo — reconnect in Connect Repo to grant access",
        },
        { status: 500 }
      );
    }

    const installationToken = await getInstallationAccessToken(
      apiToken.repo.installation.installationId
    );

    const report = await prisma.report.create({
      data: {
        repoId: apiToken.repoId,
        tokenId: apiToken.id,
        source: "PUBLIC_LINK",
        status: "PENDING",
        rawInput: description,
        reporterPrimaryKey: email || phone || randomUUID(),
        reporterName: name || "Anonymous tester",
        reporterEmail: email || null,
        reporterPhone: phone || null,
      },
    });

    const title = description.slice(0, 80) + (description.length > 80 ? "..." : "");

    let issueBody = `## Description\n\n${description}\n\n`;

    const documentRefs =
      documentFiles.length > 0
        ? await uploadDocumentsToRepo(
            installationToken,
            apiToken.repo.owner,
            apiToken.repo.name,
            report.id,
            documentFiles
          )
        : [];
    issueBody += buildAttachmentsSection(documentRefs);

    const reporterParts: string[] = [];
    if (name) reporterParts.push(name);
    if (email) reporterParts.push(`(${email})`);
    if (phone) reporterParts.push(`📞 ${phone}`);
    issueBody += reporterParts.length > 0
      ? `\n\n---\n> **Reported by:** ${reporterParts.join(" ")}`
      : "\n\n---\n> **Reported by:** Anonymous tester";
    issueBody += "\n\n*Reported via [Glitchgrab](https://glitchgrab.dev) share link*";

    try {
      const createdIssue = await createGitHubIssue(installationToken, {
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
        data: {
          status: "CREATED",
          ...(documentRefs.length > 0
            ? { metadata: JSON.parse(JSON.stringify({ documents: documentRefs })) }
            : {}),
        },
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
