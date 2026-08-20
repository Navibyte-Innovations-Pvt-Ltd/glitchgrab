export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { assertRepoAccess } from "@/lib/repo-access";

/** A week is long enough to chase a client, short enough that a leaked link dies. */
const INVITE_TTL_DAYS = 7;

/**
 * POST /api/v1/calendar/invite — mint a link for a client to connect their own
 * Google Calendar to one of your projects.
 *
 * The ordinary connect flow needs a Glitchgrab session, so it only ever works
 * for the account holder. The client whose demos we are booking has their own
 * Gmail on their own machine, and no reason to be given a login here.
 *
 * Anyone holding the link can attach a calendar to this project, so it is
 * single-use and short-lived. It grants nothing else: no read access, no
 * settings, no sight of the dashboard.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { repoId?: string; label?: string };
  const repo = await assertRepoAccess(session.user.id, body.repoId);
  if (!repo) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  // Supersede any invite still outstanding for this project. Two live links
  // means the second calendar silently replaces the first, and nobody knows
  // which one is in force.
  await prisma.calendarInvite.updateMany({
    where: { repoId: repo.id, usedAt: null },
    data: { expiresAt: new Date() },
  });

  const invite = await prisma.calendarInvite.create({
    data: {
      userId: session.user.id,
      repoId: repo.id,
      label: body.label?.slice(0, 120) || repo.fullName,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86400_000),
    },
    select: { id: true, expiresAt: true },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "";

  return NextResponse.json({
    success: true,
    data: {
      url: `${appUrl}/calendar-connect/${invite.id}`,
      expiresAt: invite.expiresAt.toISOString(),
    },
  });
}
