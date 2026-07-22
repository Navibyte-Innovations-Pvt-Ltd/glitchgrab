export const dynamic = "force-dynamic";

// Silent extension login for a QA tester (#297) — the /qa/[token] page calls
// this on load and hands the result to the Chrome extension via postMessage,
// so a tester never has to paste a gg_ token. Auth mirrors qa/checks/[checkId]:
// a magic `token` in the body, or the gg_tester OTP session cookie.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTesterSession } from "@/lib/tester-session";

export async function POST(request: Request) {
  const { token } = (await request.json().catch(() => ({}))) as { token?: string };

  const tester = token
    ? await prisma.tester.findUnique({ where: { magicToken: token } })
    : await (async () => {
        const testerId = await getTesterSession();
        return testerId ? prisma.tester.findUnique({ where: { id: testerId } }) : null;
      })();

  if (!tester) {
    return NextResponse.json({ success: false, error: "Invalid or expired link" }, { status: 401 });
  }

  const testerRepo = await prisma.testerRepo.findFirst({
    where: { testerId: tester.id },
    orderBy: { createdAt: "asc" },
    select: { repoId: true },
  });
  if (!testerRepo) {
    return NextResponse.json({ success: false, error: "No repo assigned to this tester" }, { status: 400 });
  }

  const session = await prisma.extensionSession.create({
    data: {
      tokenId: null,
      repoId: testerRepo.repoId,
      testerName: tester.name,
      testerEmail: tester.email,
    },
  });

  return NextResponse.json({
    success: true,
    data: { sessionId: session.id, testerName: tester.name, testerEmail: tester.email },
  });
}
