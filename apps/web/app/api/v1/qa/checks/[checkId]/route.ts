export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reopenGitHubIssue, commentOnGitHubIssue } from "@/lib/github";
import { sendDeveloperQaFailed } from "@/lib/whatsapp";
import { getTesterSession } from "@/lib/tester-session";

/**
 * POST /api/v1/qa/checks/[checkId] — a tester marks a check PASS or FAIL.
 * Auth: the gg_tester session cookie (OTP login) OR a magic `token` in the body.
 * Body: { result: "PASS" | "FAIL", token?: string }
 *
 * FAIL → reopen the GitHub issue, comment, WhatsApp the developer.
 * PASS → leave the issue closed, add a confirming comment.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ checkId: string }> }
) {
  const { checkId } = await params;
  const { result, token } = (await request.json()) as {
    result?: "PASS" | "FAIL";
    token?: string;
  };

  // Resolve the tester from magic token first, else the session cookie
  const tester = token
    ? await prisma.tester.findUnique({
        where: { magicToken: token },
        include: { org: { select: { name: true } } },
      })
    : await (async () => {
        const testerId = await getTesterSession();
        if (!testerId) return null;
        return prisma.tester.findUnique({
          where: { id: testerId },
          include: { org: { select: { name: true } } },
        });
      })();

  if (!tester) {
    return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 });
  }

  if (result !== "PASS" && result !== "FAIL") {
    return NextResponse.json({ success: false, error: "result must be PASS or FAIL" }, { status: 400 });
  }

  const check = await prisma.qaCheck.findFirst({
    where: { id: checkId, testerId: tester.id },
    include: { repo: { select: { owner: true, name: true, userId: true } } },
  });
  if (!check) {
    return NextResponse.json({ success: false, error: "Check not found" }, { status: 404 });
  }
  if (check.status !== "PENDING") {
    return NextResponse.json({ success: false, error: "Already verified" }, { status: 409 });
  }

  const orgName = tester.org.name;
  const { owner, name: repoName, userId } = check.repo;

  const account = await prisma.account.findFirst({
    where: { userId, provider: "github" },
    select: { access_token: true },
  });
  const ghToken = account?.access_token ?? null;

  if (result === "FAIL") {
    if (ghToken) {
      try {
        await reopenGitHubIssue(ghToken, owner, repoName, check.githubNumber);
      } catch (err) {
        console.error("[qa] reopen failed:", err);
      }
      try {
        await commentOnGitHubIssue(
          ghToken,
          owner,
          repoName,
          check.githubNumber,
          `❌ **QA failed** — tester **${tester.name}** verified this fix and it is **not working**. Reopened for rework.\n\n*Via [Glitchgrab](https://glitchgrab.dev) QA*`
        );
      } catch (err) {
        console.error("[qa] comment failed:", err);
      }
    }

    const devUser = check.developerLogin
      ? await prisma.user.findFirst({
          where: { githubLogin: check.developerLogin },
          select: { whatsappPhone: true },
        })
      : null;
    const devPhone =
      devUser?.whatsappPhone ??
      (await prisma.user.findUnique({ where: { id: userId }, select: { whatsappPhone: true } }))?.whatsappPhone;

    if (devPhone) {
      // Awaited: an un-awaited send is killed when Vercel suspends the function
      // after the response returns (ECONNRESET mid-handshake).
      await sendDeveloperQaFailed({
        phone: devPhone,
        testerName: tester.name,
        issueTitle: check.title,
        orgName,
        githubUrl: check.githubUrl,
      });
    }
  } else {
    if (ghToken) {
      try {
        await commentOnGitHubIssue(
          ghToken,
          owner,
          repoName,
          check.githubNumber,
          `✅ **QA passed** — tester **${tester.name}** verified this fix works.\n\n*Via [Glitchgrab](https://glitchgrab.dev) QA*`
        );
      } catch (err) {
        console.error("[qa] pass comment failed:", err);
      }
    }
  }

  const updated = await prisma.qaCheck.update({
    where: { id: check.id },
    data: { status: result, verifiedAt: new Date() },
  });

  return NextResponse.json({ success: true, data: { id: updated.id, status: updated.status } });
}
