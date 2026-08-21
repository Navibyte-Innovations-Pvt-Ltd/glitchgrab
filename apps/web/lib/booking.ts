import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/db";
import { getAccessToken, isScopeError } from "@/lib/calendar";

/**
 * Demo booking — the SDK dialog's server half.
 *
 * A visitor on the customer's own marketing site picks a slot, verifies their
 * WhatsApp number, and the event is created on the project owner's Google
 * calendar with a Meet link. The recording pipeline then picks it up like any
 * other calendar event, so a booked demo is transcribed and filed without
 * anyone pressing anything.
 *
 * Everything here runs for an ANONYMOUS caller authenticated only by the
 * project's public SDK token, so nothing in this file may leak anything about
 * the owner beyond "these times are free".
 */

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

/** How long a slot is held while the visitor enters their code. */
export const HOLD_MINUTES = 10;
/** Wrong codes allowed before the hold is burned. */
export const MAX_OTP_ATTEMPTS = 5;

export interface Slot {
  /** ISO instant the demo would start. */
  startsAt: string;
  endsAt: string;
}

interface WorkingHours {
  /** ISO weekday (1 = Monday) → list of [from, to] in "HH:MM", owner's zone. */
  [weekday: string]: [string, string][];
}

export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Four digits, not six.
 *
 * This is typed on a phone by someone who wants a demo, not a password reset —
 * every extra digit is another chance to give up. Brute force is handled by the
 * five-attempt cap and the ten-minute hold, not by length: 10,000 combinations
 * against five tries is a 1-in-2,000 chance per booking, and a wrong code burns
 * the slot.
 */
export function generateOtp(): string {
  // randomInt, not Math.random: this is the only thing standing between a
  // stranger and an event on someone's real calendar.
  return String(randomInt(1000, 10000));
}

/**
 * Offset of a zone from UTC, in minutes, at a given instant.
 *
 * Computed by formatting the instant in the zone and reading the wall clock
 * back — the only way to get this right across DST without a date library.
 */
function zoneOffsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(at);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return (asUtc - at.getTime()) / 60_000;
}

/**
 * The instant at which a wall-clock time occurs on a given local date.
 *
 * Applied twice: the first correction can land on the other side of a DST
 * change, and the second settles it.
 */
function zonedTimeToUtc(localDate: string, hhmm: string, timeZone: string): Date {
  const naive = new Date(`${localDate}T${hhmm}:00Z`);
  let instant = new Date(naive.getTime() - zoneOffsetMinutes(naive, timeZone) * 60_000);
  instant = new Date(naive.getTime() - zoneOffsetMinutes(instant, timeZone) * 60_000);
  return instant;
}

/** `YYYY-MM-DD` for an instant, as seen in a zone. */
function localDateKey(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** ISO weekday (1 = Monday) for an instant, as seen in a zone. */
function localWeekday(at: Date, timeZone: string): number {
  const short = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short" }).format(at);
  return ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 } as Record<string, number>)[short] ?? 0;
}

/** Busy intervals from Google, across every calendar the owner has. */
async function fetchBusy(
  connectionId: string,
  from: Date,
  to: Date
): Promise<{ start: Date; end: Date }[] | { error: string }> {
  const token = await getAccessToken(connectionId);
  if (!token) return { error: "Calendar not connected" };

  const res = await fetch(`${CALENDAR_API}/freeBusy`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      items: [{ id: "primary" }],
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    if (isScopeError(res.status, body)) {
      return { error: "Reconnect Google Calendar to enable booking" };
    }
    return { error: `Calendar said ${res.status}` };
  }

  try {
    const json = JSON.parse(body) as {
      calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
    };
    return Object.values(json.calendars ?? {})
      .flatMap((c) => c.busy ?? [])
      .map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
  } catch {
    return { error: "Calendar returned something unreadable" };
  }
}

/**
 * Free slots for a project, between two instants.
 *
 * Three things remove a slot: it falls outside the owner's working hours, it
 * overlaps something already in their calendar, or Glitchgrab itself is
 * holding it for someone mid-verification. The third is why held bookings are
 * checked here and not only at confirm time — a slot someone is actively
 * claiming must stop being offered immediately.
 */
export async function getAvailability(params: {
  repoId: string;
  connectionId: string;
  from: Date;
  to: Date;
}): Promise<{ slots: Slot[] } | { error: string }> {
  const page = await prisma.bookingPage.findUnique({
    where: { repoId: params.repoId },
  });
  if (!page || !page.enabled) return { error: "Booking is not enabled for this project" };

  const hours = (page.workingHours ?? {}) as WorkingHours;
  if (Object.keys(hours).length === 0) return { error: "No working hours set" };

  const now = Date.now();
  const earliest = now + page.noticeMinutes * 60_000;
  const latest = now + page.horizonDays * 24 * 60 * 60_000;

  const from = new Date(Math.max(params.from.getTime(), earliest));
  const to = new Date(Math.min(params.to.getTime(), latest));
  if (from >= to) return { slots: [] };

  const busy = await fetchBusy(params.connectionId, from, to);
  if ("error" in busy) return busy;

  // Slots already spoken for by Glitchgrab: confirmed bookings are in Google
  // too, but a PENDING hold is not — it exists precisely so the slot cannot be
  // taken twice while a code is in flight.
  const claimed = await prisma.booking.findMany({
    where: {
      repoId: params.repoId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startsAt: { gte: from, lt: to },
      OR: [{ otpExpires: null }, { otpExpires: { gt: new Date() } }, { status: "CONFIRMED" }],
    },
    select: { startsAt: true, endsAt: true },
  });

  const taken = [...busy, ...claimed.map((b) => ({ start: b.startsAt, end: b.endsAt }))];

  const step = (page.slotMinutes + page.bufferMinutes) * 60_000;
  const length = page.slotMinutes * 60_000;
  const slots: Slot[] = [];

  // Slots are generated from each day's OPENING time, not from the clock.
  //
  // Walking the window in fixed steps from "now" produced 09:30, 10:30, 11:30 —
  // times nobody would choose to offer. Starting at the top of each working
  // range gives 09:00, 10:00, 11:00, which is what the hours actually say.
  for (let day = 0; day <= page.horizonDays; day++) {
    const dayAnchor = new Date(from.getTime() + day * 86400_000);
    const dateKey = localDateKey(dayAnchor, page.timezone);
    const ranges = hours[String(localWeekday(dayAnchor, page.timezone))] ?? [];

    for (const [open, close] of ranges) {
      const opensAt = zonedTimeToUtc(dateKey, open, page.timezone);
      const closesAt = zonedTimeToUtc(dateKey, close, page.timezone);

      for (let t = opensAt.getTime(); t + length <= closesAt.getTime(); t += step) {
        const start = new Date(t);
        const end = new Date(t + length);

        // The window itself already accounts for notice and horizon.
        if (start < from || end > to) continue;
        if (taken.some((b) => start < b.end && end > b.start)) continue;

        slots.push({ startsAt: start.toISOString(), endsAt: end.toISOString() });
      }
    }
  }

  slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return { slots };
}

/**
 * Create the demo on the owner's calendar, with a Meet link.
 *
 * `conferenceDataVersion=1` is what actually mints the Meet room; without it
 * Google accepts the request and silently returns an event with no conference
 * attached, which looks like success right up until someone tries to join.
 */
export async function insertCalendarEvent(params: {
  connectionId: string;
  summary: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  attendeeEmail: string;
  attendeeName: string;
  timezone: string;
}): Promise<{ eventId: string; meetUrl: string } | { error: string }> {
  const token = await getAccessToken(params.connectionId);
  if (!token) return { error: "Calendar not connected" };

  const res = await fetch(
    `${CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: params.summary,
        description: params.description,
        start: { dateTime: params.startsAt.toISOString(), timeZone: params.timezone },
        end: { dateTime: params.endsAt.toISOString(), timeZone: params.timezone },
        attendees: [{ email: params.attendeeEmail, displayName: params.attendeeName }],
        conferenceData: {
          createRequest: {
            requestId: `gg-${Date.now()}-${randomInt(1000, 9999)}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    }
  );

  const body = await res.text();
  if (!res.ok) {
    if (isScopeError(res.status, body)) {
      return { error: "Reconnect Google Calendar to enable booking" };
    }
    return { error: `Calendar said ${res.status}` };
  }

  try {
    const event = JSON.parse(body) as {
      id?: string;
      hangoutLink?: string;
      conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
    };
    const meetUrl =
      event.hangoutLink ??
      event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ??
      "";

    if (!event.id || !meetUrl) return { error: "Google created the event without a Meet link" };
    return { eventId: event.id, meetUrl };
  } catch {
    return { error: "Calendar returned something unreadable" };
  }
}

/**
 * Move an existing demo to a new time.
 *
 * A PATCH, not a delete-and-recreate. The Meet link lives on the event, so
 * recreating mints a NEW room and every "Join demo" button already delivered —
 * in the confirmation, in the reminder, in the calendar invite — silently
 * points at a dead meeting. Patching keeps the room and lets Google tell the
 * attendees the time moved.
 *
 * Only start and end are sent. Including `conferenceData` risks detaching the
 * very room this exists to preserve.
 */
export async function patchCalendarEvent(params: {
  connectionId: string;
  eventId: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
}): Promise<{ ok: true } | { error: string }> {
  const token = await getAccessToken(params.connectionId);
  if (!token) return { error: "Calendar not connected" };

  const res = await fetch(
    `${CALENDAR_API}/calendars/primary/events/${encodeURIComponent(params.eventId)}?sendUpdates=all`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        start: { dateTime: params.startsAt.toISOString(), timeZone: params.timezone },
        end: { dateTime: params.endsAt.toISOString(), timeZone: params.timezone },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    if (isScopeError(res.status, body)) {
      return { error: "Reconnect Google Calendar to enable booking" };
    }
    return { error: `Calendar said ${res.status}` };
  }
  return { ok: true };
}

/**
 * Delete a demo from the calendar.
 *
 * 404 and 410 count as success: Meta retries a webhook whenever we answer
 * non-200, so this runs twice for one tap more often than not. Treating "the
 * event is already gone" as failure would report a cancellation as broken to
 * someone whose call is, in fact, cancelled.
 */
export async function cancelCalendarEvent(params: {
  connectionId: string;
  eventId: string;
}): Promise<{ ok: true } | { error: string }> {
  const token = await getAccessToken(params.connectionId);
  if (!token) return { error: "Calendar not connected" };

  const res = await fetch(
    `${CALENDAR_API}/calendars/primary/events/${encodeURIComponent(params.eventId)}?sendUpdates=all`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );

  if (res.ok || res.status === 404 || res.status === 410) return { ok: true };
  return { error: `Calendar said ${res.status}` };
}
