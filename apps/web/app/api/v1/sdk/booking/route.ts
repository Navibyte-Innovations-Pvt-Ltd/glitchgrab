export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateOtp, hashOtp, HOLD_MINUTES } from "@/lib/booking";
import { BOOKING_CORS, resolveBookingContext } from "@/lib/booking-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendWhatsappOtp } from "@/lib/whatsapp";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: BOOKING_CORS });
}

/** Digits only, so "+91 98765 43210" and "9876543210" are the same number. */
function normalisePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * POST /api/v1/sdk/booking — hold a slot and send a WhatsApp code.
 *
 * The row is created BEFORE the number is verified, on purpose: the slot has
 * to stop being offered the moment someone starts claiming it, or two visitors
 * racing for the last 3pm both get told it is theirs. The hold expires, and a
 * partial unique index makes the database — not this code — the arbiter of who
 * won.
 *
 * Nothing reaches the owner's calendar until the code comes back.
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
      name?: string;
      email?: string;
      phone?: string;
      startsAt?: string;
      timezone?: string;
      note?: string;
    };

    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const phone = normalisePhone(body.phone ?? "");
    const startsAt = new Date(body.startsAt ?? "");

    if (!name || !email.includes("@") || phone.length < 8 || Number.isNaN(startsAt.getTime())) {
      return NextResponse.json(
        { success: false, error: "Name, email, WhatsApp number and a slot are all required" },
        { status: 400, headers: BOOKING_CORS }
      );
    }

    // Per number, not per token: one visitor cannot burn the project's whole
    // allowance, and a bot cycling numbers is the case the OTP itself stops.
    const limit = await checkRateLimit(`booking-start:${phone}`, 5);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many attempts — try again later" },
        { status: 429, headers: BOOKING_CORS }
      );
    }

    const page = await prisma.bookingPage.findUnique({ where: { repoId: ctx.repoId } });
    if (!page?.enabled) {
      return NextResponse.json(
        { success: false, error: "Booking is not enabled for this project" },
        { status: 409, headers: BOOKING_CORS }
      );
    }

    const endsAt = new Date(startsAt.getTime() + page.slotMinutes * 60_000);
    if (startsAt.getTime() < Date.now() + page.noticeMinutes * 60_000) {
      return NextResponse.json(
        { success: false, error: "That slot is too soon — pick a later one" },
        { status: 409, headers: BOOKING_CORS }
      );
    }

    // Expired holds still occupy the slot as far as the unique index is
    // concerned, so clear them before trying to take it.
    await prisma.booking.updateMany({
      where: { repoId: ctx.repoId, status: "PENDING", otpExpires: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });

    const code = generateOtp();

    let booking;
    try {
      booking = await prisma.booking.create({
        data: {
          pageId: page.id,
          repoId: ctx.repoId,
          name,
          email,
          phone,
          startsAt,
          endsAt,
          timezone: body.timezone?.slice(0, 64) ?? null,
          note: body.note?.trim().slice(0, 500) || null,
          otpHash: hashOtp(code),
          otpSentAt: new Date(),
          otpExpires: new Date(Date.now() + HOLD_MINUTES * 60_000),
        },
        select: { id: true },
      });
    } catch {
      // The partial unique index rejected it — someone else holds this slot.
      return NextResponse.json(
        { success: false, error: "That slot was just taken — pick another" },
        { status: 409, headers: BOOKING_CORS }
      );
    }

    const sent = await sendWhatsappOtp(phone, code);
    if (!sent.ok) {
      // Release the hold rather than leaving a slot blocked by a code that
      // never arrived.
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { success: false, error: "Couldn't send the WhatsApp code — check the number" },
        { status: 502, headers: BOOKING_CORS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: { bookingId: booking.id, holdMinutes: HOLD_MINUTES, phoneLast4: phone.slice(-4) },
      },
      { headers: BOOKING_CORS }
    );
  } catch (error) {
    console.error("Booking start error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: BOOKING_CORS }
    );
  }
}
