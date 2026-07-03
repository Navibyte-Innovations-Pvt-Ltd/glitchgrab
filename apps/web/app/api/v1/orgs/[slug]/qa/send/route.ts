export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendTesterQaRequest } from "@/lib/whatsapp";

/**
 * POST /api/v1/orgs/[slug]/qa/send
 * Manually hand a GitHub issue to the repo's tester(s) for QA — the escape hatch
 * so you don't need a merged PR to exercise the flow. Owner-only.
 * Body: { repoFullName, githubNumber, title, githubUrl }
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const { repoFullName, githubNumber, title, githubUrl } = (await request.json()) as {
    repoFullName?: string;
    githubNumber?: number;
    title?: string;
    githubUrl?: string;
  };

  if (!repoFullName || !githubNumber || !githubUrl) {
    return NextResponse.json({ success: false, error: "repoFullName, githubNumber, githubUrl required" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { githubOrgLogin: slug } });
  if (!org) return NextResponse.json({ success: false, error: "Org not found" }, { status: 404 });

  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: session.user.id } },
  });
  if (!member || member.role !== "OWNER") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const repo = await prisma.repo.findFirst({
    where: { fullName: repoFullName, orgId: org.id },
    select: { id: true },
  });
  if (!repo) {
    return NextResponse.json({ success: false, error: "Repo not connected to this org" }, { status: 404 });
  }

  const testerRepos = await prisma.testerRepo.findMany({
    where: { repoId: repo.id },
    include: { tester: { select: { id: true, name: true, phone: true, magicToken: true } } },
  });

  if (testerRepos.length === 0) {
    return NextResponse.json({ success: false, error: "No testers assigned to this repo. Assign one first." }, { status: 400 });
  }

  const developerName = session.user.name ?? "A developer";
  const issueTitle = title?.trim() || `Issue #${githubNumber}`;
  let sent = 0;

  for (const tr of testerRepos) {
    const tester = tr.tester;

    // Skip if this tester already has a PENDING manual check for this issue
    const existing = await prisma.qaCheck.findFirst({
      where: { testerId: tester.id, repoId: repo.id, githubNumber, prNumber: null, status: "PENDING" },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.qaCheck.create({
      data: {
        testerId: tester.id,
        repoId: repo.id,
        githubNumber,
        githubUrl,
        title: issueTitle,
        // Manual send has no PR author; FAIL notifications fall back to repo owner.
        developerLogin: null,
      },
    });
    sent++;

    if (tester.phone) {
      await sendTesterQaRequest({
        phone: tester.phone,
        testerName: tester.name,
        developerName,
        issueCount: 1,
        orgName: org.name,
        magicToken: tester.magicToken,
      });
    }
  }

  return NextResponse.json({ success: true, data: { sent, testers: testerRepos.length } });
}
