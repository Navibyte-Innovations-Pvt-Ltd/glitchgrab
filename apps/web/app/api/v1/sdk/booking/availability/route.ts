export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAvailability } from "@/lib/booking";
import { BOOKING_CORS, resolveBookingContext } from "@/lib/booking-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: BOOKING_CORS });
}

/**
 * GET /api/v1/sdk/booking/availability?from=&to=
 *
 * Free slots for the project this token belongs to. Called by the booking
 * dialog as the visitor moves between days.
 */
export async function GET(request: Request) {
  try {
    const resolved = await resolveBookingContext(request);
    if ("error" in resolved) {
      return NextResponse.json(
        { success: false, error: resolved.error },
        { status: resolved.status, headers: BOOKING_CORS }
      );
    }
    const { ctx } = resolved;

    // Generous: the dialog legitimately asks once per day the visitor views.
    const limit = await checkRateLimit(`booking-avail:${ctx.tokenHash}`, 600);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429, headers: BOOKING_CORS }
      );
    }

    const url = new URL(request.url);
    const from = new Date(url.searchParams.get("from") ?? Date.now());
    const to = new Date(url.searchParams.get("to") ?? Date.now() + 7 * 86400_000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date range" },
        { status: 400, headers: BOOKING_CORS }
      );
    }

    const page = await prisma.bookingPage.findUnique({
      where: { repoId: ctx.repoId },
      select: {
        title: true,
        description: true,
        slotMinutes: true,
        timezone: true,
        enabled: true,
        whatsappCode: true,
      },
    });

    // The other door: a wa.me link prefilled with this project's code, so a
    // visitor who would rather talk than fill a form lands in a conversation
    // that already knows what they want a demo of.
    const waNumber = process.env.META_WA_PUBLIC_NUMBER?.replace(/\D/g, "");
    const whatsappUrl =
      waNumber && page?.whatsappCode
        ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi, I'd like a demo: ${page.whatsappCode}`)}`
        : null;

    const result = await getAvailability({
      repoId: ctx.repoId,
      connectionId: ctx.connectionId,
      from,
      to,
    });

    if ("error" in result) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 409, headers: BOOKING_CORS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          slots: result.slots,
          title: page?.title ?? `Book a demo`,
          description: page?.description ?? null,
          slotMinutes: page?.slotMinutes ?? 30,
          timezone: page?.timezone ?? "Asia/Kolkata",
          whatsappUrl,
        },
      },
      { headers: BOOKING_CORS }
    );
  } catch (error) {
    console.error("Booking availability error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: BOOKING_CORS }
    );
  }
}
