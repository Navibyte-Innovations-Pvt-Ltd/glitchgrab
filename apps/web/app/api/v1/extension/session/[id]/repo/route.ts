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

  const result = await prisma.extensionSession.updateMany({
    where: { id, endedAt: null },
    data: { repoId },
  });
  if (result.count === 0) {
    return NextResponse.json({ success: false, error: "Session not found or already ended" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
