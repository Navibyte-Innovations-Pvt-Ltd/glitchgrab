export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashOtp, insertCalendarEvent, MAX_OTP_ATTEMPTS } from "@/lib/booking";
import { BOOKING_CORS, resolveBookingContext } from "@/lib/booking-auth";
import { sendBookingConfirmed, sendOwnerNewBooking } from "@/lib/whatsapp";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: BOOKING_CORS });
}

/**
 * POST /api/v1/sdk/booking/verify — confirm the code and create the demo.
 *
 * This is the only place an anonymous visitor causes something to appear on
 * someone else's calendar, so the order matters: verify the code, then create
 * the event, then confirm the row. If the calendar call fails the booking stays
 * PENDING and the slot is released, rather than a confirmed booking existing
 * that nobody was ever invited to.
 */
export async function POST(request: Request) {
  try {
    const resolved = await resolveBookingContext(request);
    if ("error" in resolved) {
      return NextResponse.json(
        { success: false, error: resolved.error },
        { status: resolved.status, headers: BOOKING_CORS }
      );
    }
    const { ctx } = resolved;

    const body = (await request.json().catch(() => ({}))) as {
      bookingId?: string;
      code?: string;
    };
    if (!body.bookingId || !body.code) {
      return NextResponse.json(
        { success: false, error: "Booking and code are required" },
        { status: 400, headers: BOOKING_CORS }
      );
    }

    const booking = await prisma.booking.findFirst({
      // Scoped to this token's project: a booking id from one site must not be
      // confirmable through another site's dialog.
      where: { id: body.bookingId, repoId: ctx.repoId },
    });
    if (!booking || booking.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "That booking is no longer open" },
        { status: 409, headers: BOOKING_CORS }
      );
    }

    if (booking.otpExpires && booking.otpExpires < new Date()) {
      await prisma.booking.update({ where: { id: booking.id }, data: { status: "EXPIRED" } });
      return NextResponse.json(
        { success: false, error: "The code expired — please pick a slot again" },
        { status: 409, headers: BOOKING_CORS }
      );
    }

    if (booking.otpAttempts >= MAX_OTP_ATTEMPTS) {
      await prisma.booking.update({ where: { id: booking.id }, data: { status: "EXPIRED" } });
      return NextResponse.json(
        { success: false, error: "Too many wrong codes — please start again" },
        { status: 429, headers: BOOKING_CORS }
      );
    }

    if (booking.otpHash !== hashOtp(body.code.trim())) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { otpAttempts: { increment: 1 } },
      });
      return NextResponse.json(
        { success: false, error: "That code doesn't match" },
        { status: 401, headers: BOOKING_CORS }
      );
    }

    const page = await prisma.bookingPage.findUnique({ where: { repoId: ctx.repoId } });

    const event = await insertCalendarEvent({
      connectionId: ctx.connectionId,
      summary: `${ctx.repoName} demo — ${booking.name}`,
      description:
        `Demo booked through Glitchgrab.\n\n` +
        `Name: ${booking.name}\nEmail: ${booking.email}\nWhatsApp: +${booking.phone}` +
        (booking.note ? `\n\nNote: ${booking.note}` : ""),
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      attendeeEmail: booking.email,
      attendeeName: booking.name,
      timezone: page?.timezone ?? "Asia/Kolkata",
    });

    if ("error" in event) {
      // Release the slot: a booking nobody was invited to is worse than none.
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { success: false, error: event.error },
        { status: 502, headers: BOOKING_CORS }
      );
    }

    // Demos are always recorded, whatever the project's auto-record switch says
    // — being able to go back to what was promised on a demo call is the reason
    // this lives in Glitchgrab rather than in cal.com.
    const meeting = await prisma.meeting.create({
      data: {
        repoId: ctx.repoId,
        title: `${ctx.repoName} demo — ${booking.name}`,
        meetUrl: event.meetUrl,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        status: "SCHEDULED",
        recorder: "bot",
        botStatus: null,
        createdById: ctx.ownerUserId,
      },
      select: { id: true },
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CONFIRMED",
        calendarEventId: event.eventId,
        meetUrl: event.meetUrl,
        meetingId: meeting.id,
        otpHash: null,
      },
    });

    // Awaited, not fire-and-forget: an un-awaited fetch in a route handler is
    // killed when the response is sent, and the confirmation silently never
    // arrives.
    await sendBookingConfirmed({
      phone: booking.phone,
      name: booking.name,
      project: ctx.repoName,
      startsAt: booking.startsAt,
      timezone: booking.timezone ?? page?.timezone ?? "Asia/Kolkata",
      meetUrl: event.meetUrl,
    }).catch(() => {});

    const owner = await prisma.user.findUnique({
      where: { id: ctx.ownerUserId },
      select: { whatsappPhone: true },
    });
    if (owner?.whatsappPhone) {
      await sendOwnerNewBooking({
        phone: owner.whatsappPhone,
        project: ctx.repoName,
        bookerName: booking.name,
        startsAt: booking.startsAt,
        timezone: page?.timezone ?? "Asia/Kolkata",
      }).catch(() => {});
      await prisma.booking.update({
        where: { id: booking.id },
        data: { ownerNotifiedAt: new Date() },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          meetUrl: event.meetUrl,
          startsAt: booking.startsAt.toISOString(),
          endsAt: booking.endsAt.toISOString(),
        },
      },
      { headers: BOOKING_CORS }
    );
  } catch (error) {
    console.error("Booking verify error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: BOOKING_CORS }
    );
  }
}
