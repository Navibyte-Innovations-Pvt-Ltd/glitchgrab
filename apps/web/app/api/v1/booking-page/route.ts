export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { assertRepoAccess } from "@/lib/repo-access";

/**
 * Demo booking settings for one project (dashboard, session auth).
 *
 * Separate from the SDK endpoints on purpose: those are reachable by anyone who
 * can read a customer's page source, and must never be able to change when the
 * owner is available or turn booking on.
 */

/** Mon–Fri 09:00–17:00, the hours the first projects actually work. */
const DEFAULT_HOURS = {
  "1": [["09:00", "17:00"]],
  "2": [["09:00", "17:00"]],
  "3": [["09:00", "17:00"]],
  "4": [["09:00", "17:00"]],
  "5": [["09:00", "17:00"]],
};

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const repoId = new URL(request.url).searchParams.get("repoId");
  const repo = await assertRepoAccess(session.user.id, repoId);
  if (!repo) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const page = await prisma.bookingPage.findUnique({ where: { repoId: repo.id } });
  const connection = await prisma.calendarConnection.findFirst({
    where: { userId: session.user.id },
    select: { googleEmail: true },
  });

  return NextResponse.json({
    success: true,
    data: {
      page,
      // Booking cannot work without a calendar, and "no slots" is a terrible
      // way to discover that.
      calendarConnected: Boolean(connection),
      calendarEmail: connection?.googleEmail ?? null,
      defaults: { workingHours: DEFAULT_HOURS, slotMinutes: 60, timezone: "Asia/Kolkata" },
    },
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    repoId?: string;
    enabled?: boolean;
    slotMinutes?: number;
    bufferMinutes?: number;
    timezone?: string;
    workingHours?: unknown;
    title?: string;
    description?: string;
    horizonDays?: number;
    noticeMinutes?: number;
    whatsappCode?: string;
  };

  const repo = await assertRepoAccess(session.user.id, body.repoId);
  if (!repo) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  // The code appears in a public wa.me link and is matched against bare inbound
  // text, so it has to be unguessably distinct from nothing but itself: lower
  // case, no spaces, unique across every project.
  const code = body.whatsappCode?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "") || null;
  if (code) {
    const clash = await prisma.bookingPage.findFirst({
      where: { whatsappCode: code, NOT: { repoId: repo.id } },
      select: { id: true },
    });
    if (clash) {
      return NextResponse.json(
        { success: false, error: "That WhatsApp code is already used by another project" },
        { status: 409 }
      );
    }
  }

  const data = {
    enabled: body.enabled ?? false,
    slotMinutes: Math.min(Math.max(body.slotMinutes ?? 60, 15), 180),
    bufferMinutes: Math.min(Math.max(body.bufferMinutes ?? 0, 0), 120),
    timezone: body.timezone?.slice(0, 64) || "Asia/Kolkata",
    workingHours: (body.workingHours ?? DEFAULT_HOURS) as object,
    title: body.title?.slice(0, 120) || null,
    description: body.description?.slice(0, 400) || null,
    horizonDays: Math.min(Math.max(body.horizonDays ?? 15, 1), 90),
    noticeMinutes: Math.min(Math.max(body.noticeMinutes ?? 120, 0), 10080),
    whatsappCode: code,
  };

  const page = await prisma.bookingPage.upsert({
    where: { repoId: repo.id },
    create: { repoId: repo.id, ...data },
    update: data,
  });

  return NextResponse.json({ success: true, data: { page } });
}
