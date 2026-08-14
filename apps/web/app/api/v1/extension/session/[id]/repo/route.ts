export const dynamic = "force-dynamic";

// GlitchRecord calls this the moment a recording starts against a real repo
// (#297) — backfills ExtensionSession.repoId, which is unknown at auto-login
// time (a dashboard owner may have dozens of repos; a QA tester may be
// assigned several). Auth: Bearer GlitchRecordToken — same as
// /api/v1/glitchrecord/issue — and repoId must belong to that token's user.
// Without this, the session id alone (unguessable but not secret to whoever
// it belongs to) would let a caller redirect where a tester's tracked time
// shows up by claiming an arbitrary repoId (IDOR, caught in review).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const tokenHash = hashToken(authHeader.replace("Bearer ", ""));
  const record = await prisma.glitchRecordToken.findUnique({
    where: { tokenHash },
    select: { userId: true, expiresAt: true },
  });
  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json({ success: false, error: "Invalid or expired token" }, { status: 401 });
  }

  const { repoId } = (await request.json().catch(() => ({}))) as { repoId?: string };
  if (!repoId) {
    return NextResponse.json({ success: false, error: "repoId required" }, { status: 400 });
  }

  const repo = await prisma.repo.findFirst({ where: { id: repoId, userId: record.userId }, select: { id: true } });
  if (!repo) {
    return NextResponse.json({ success: false, error: "Repo not found" }, { status: 404 });
  }

  // Owning the repo is not enough — the SESSION has to be ours too. Without this
  // any valid GlitchRecordToken holder who learns a session id could repoint
  // someone else's tester session at their own repo, moving that tester's tracked
  // work time into the caller's audit log (IDOR). A session is ours when it is:
  //   • a dashboard owner's auto-login  → userId is us
  //   • a QA tester's magic-link login  → that tester is assigned to this repo,
  //     which we already proved we own
  //   • a popup gg_-token login         → that token belongs to a repo we own
  // 404 rather than 403 throughout, so a probe can't confirm an id exists.
  const session = await prisma.extensionSession.findUnique({
    where: { id },
    select: { endedAt: true, userId: true, testerId: true, tokenId: true },
  });
  if (!session || session.endedAt) {
    return NextResponse.json({ success: false, error: "Session not found or already ended" }, { status: 404 });
  }

  let ownsSession = session.userId === record.userId;
  if (!ownsSession && session.testerId) {
    const assigned = await prisma.testerRepo.count({
      where: { testerId: session.testerId, repoId },
    });
    ownsSession = assigned > 0;
  }
  if (!ownsSession && session.tokenId) {
    const ownToken = await prisma.apiToken.count({
      where: { id: session.tokenId, repo: { userId: record.userId } },
    });
    ownsSession = ownToken > 0;
  }
  if (!ownsSession) {
    return NextResponse.json({ success: false, error: "Session not found or already ended" }, { status: 404 });
  }

  await prisma.extensionSession.update({ where: { id }, data: { repoId } });

  return NextResponse.json({ success: true });
}
