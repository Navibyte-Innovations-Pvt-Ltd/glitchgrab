export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { commentOnGitHubIssue } from "@/lib/github";
import { getInstallationAccessToken } from "@/lib/github-app";
import { getTesterSession } from "@/lib/tester-session";

/**
 * POST /api/v1/qa/checks/[checkId]/comment — a tester leaves a plain comment on
 * the GitHub issue without passing or failing it.
 *
 * Auth: the gg_tester session cookie (OTP login) OR a magic `token` in the body.
 * Body: { message: string, token?: string }
 *
 * Exists because the only way a tester could previously say anything on an issue
 * was FAIL, which demands a screenshot and reopens the issue. Testers were
 * commenting straight on github.com instead, where the comment carries whichever
 * GitHub account they were signed into — not their tester identity. Every comment
 * from here posts as the GitHub App with a [TESTER: name] header, so the developer
 * always knows who is speaking.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ checkId: string }> }
) {
  const { checkId } = await params;
  const { message, token } = (await request.json()) as { message?: string; token?: string };

  const tester = token
    ? await prisma.tester.findUnique({ where: { magicToken: token } })
    : await (async () => {
        const testerId = await getTesterSession();
        if (!testerId) return null;
        return prisma.tester.findUnique({ where: { id: testerId } });
      })();

  if (!tester) {
    return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 });
  }

  if (!message?.trim()) {
    return NextResponse.json({ success: false, error: "message is required" }, { status: 400 });
  }

  const check = await prisma.qaCheck.findFirst({
    where: { id: checkId, testerId: tester.id },
    include: {
      repo: {
        select: {
          owner: true,
          name: true,
          installation: { select: { installationId: true } },
        },
      },
    },
  });
  if (!check) {
    return NextResponse.json({ success: false, error: "Check not found" }, { status: 404 });
  }
  if (!check.repo.installation) {
    return NextResponse.json(
      {
        success: false,
        error: "GitHub App not installed on this repo — reconnect in Connect Repo to grant access",
      },
      { status: 500 }
    );
  }

  const ghToken = await getInstallationAccessToken(check.repo.installation.installationId);

  try {
    await commentOnGitHubIssue(
      ghToken,
      check.repo.owner,
      check.repo.name,
      check.githubNumber,
      `💬 **[TESTER: ${tester.name}]** commented:\n\n${message.trim()}\n\n*Via [Glitchgrab](https://glitchgrab.dev) QA*`
    );
  } catch (err) {
    console.error("[qa] tester comment failed:", err);
    return NextResponse.json({ success: false, error: "GitHub rejected the comment" }, { status: 502 });
  }

  return NextResponse.json({ success: true, data: { checkId: check.id } });
}
