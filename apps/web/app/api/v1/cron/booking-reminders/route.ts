export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendBookingReminder, sendOwnerBookingStarting } from "@/lib/whatsapp";

/**
 * Cron: remind both sides before a booked demo, and release dead holds.
 *
 * Runs every 5 minutes, so the window has to be wider than that — a booking
 * whose reminder moment fell between two runs would otherwise never get one.
 * `reminderSentAt` is what stops the overlap sending twice.
 */
const REMIND_FROM_MINUTES = 25;
const REMIND_TO_MINUTES = 40;

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // A hold whose code never came back is not a booking — release the slot so
  // someone else can have it. Cheap, and keeps the availability query honest.
  const released = await prisma.booking.updateMany({
    where: { status: "PENDING", otpExpires: { lt: now } },
    data: { status: "EXPIRED" },
  });

  const due = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      startsAt: {
        gte: new Date(now.getTime() + REMIND_FROM_MINUTES * 60_000),
        lte: new Date(now.getTime() + REMIND_TO_MINUTES * 60_000),
      },
    },
    include: {
      page: { select: { timezone: true } },
      repo: { select: { name: true, user: { select: { whatsappPhone: true } } } },
    },
    take: 50,
  });

  const results: { id: string; booker: boolean; owner: boolean }[] = [];

  for (const booking of due) {
    const project = booking.repo.name;
    const timezone = booking.timezone ?? booking.page.timezone;
    const meetUrl = booking.meetUrl ?? "";

    const booker = await sendBookingReminder({
      phone: booking.phone,
      project,
      startsAt: booking.startsAt,
      timezone,
      meetUrl,
    }).catch(() => ({ ok: false }));

    let owner = { ok: false };
    if (booking.repo.user.whatsappPhone) {
      owner = await sendOwnerBookingStarting({
        phone: booking.repo.user.whatsappPhone,
        project,
        bookerName: booking.name,
        // The owner reads this in their own working timezone, which is the
        // project's — not whatever zone the visitor booked from.
        startsAt: booking.startsAt,
        timezone: booking.page.timezone,
        meetUrl,
      }).catch(() => ({ ok: false }));
    }

    // Stamped whatever happened: a failed send is not worth retrying every
    // five minutes for the rest of the day, and a duplicate reminder reads
    // worse than a missing one.
    await prisma.booking.update({
      where: { id: booking.id },
      data: { reminderSentAt: new Date() },
    });

    results.push({ id: booking.id, booker: booker.ok, owner: owner.ok });
  }

  return NextResponse.json({
    success: true,
    data: { reminded: results, holdsReleased: released.count },
  });
}
