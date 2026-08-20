import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

/**
 * Resolve an SDK token to the project it books demos for.
 *
 * Everything the booking dialog calls is reachable by anyone who can read the
 * customer's page source — the SDK token ships to the browser by design. So
 * this returns only what a stranger is allowed to influence: which project,
 * and whose calendar to read. Never the owner's identity or email.
 */
interface BookingContext {
  repoId: string;
  repoName: string;
  tokenHash: string;
  connectionId: string;
  ownerUserId: string;
}

export async function resolveBookingContext(
  request: Request
): Promise<{ ctx: BookingContext } | { error: string; status: number }> {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return { error: "Unauthorized", status: 401 };

  const tokenHash = hashToken(header.replace("Bearer ", ""));
  const apiToken = await prisma.apiToken.findUnique({
    where: { tokenHash },
    select: { repo: { select: { id: true, name: true, userId: true } } },
  });
  if (!apiToken) return { error: "Invalid API token", status: 401 };

  // The Google connection is what makes booking possible at all. A project
  // whose owner has not connected a calendar cannot offer slots, and saying so
  // plainly beats an empty list that looks like "fully booked".
  //
  // The project's OWN choice wins: one account can hold several clients'
  // calendars, and PracticeStack demos belong on the PracticeStack calendar.
  // Falling back to the oldest connection keeps a single-calendar setup working.
  const page = await prisma.bookingPage.findUnique({
    where: { repoId: apiToken.repo.id },
    select: { calendarConnectionId: true },
  });

  const connection = page?.calendarConnectionId
    ? await prisma.calendarConnection.findFirst({
        // Re-checked against the owner: a connection id left behind by a
        // reassigned repo must not read someone else's calendar.
        where: { id: page.calendarConnectionId, userId: apiToken.repo.userId },
        select: { id: true },
      })
    : await prisma.calendarConnection.findFirst({
        where: { userId: apiToken.repo.userId },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });

  if (!connection) return { error: "This project has no calendar connected", status: 409 };

  return {
    ctx: {
      repoId: apiToken.repo.id,
      repoName: apiToken.repo.name,
      tokenHash,
      connectionId: connection.id,
      ownerUserId: apiToken.repo.userId,
    },
  };
}

export const BOOKING_CORS = {
  // The dialog runs on the customer's own domain, which we do not know.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};
