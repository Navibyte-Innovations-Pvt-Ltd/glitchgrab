import { prisma } from "@/lib/db";
import {
  cancelCalendarEvent,
  getAvailability,
  insertCalendarEvent,
  patchCalendarEvent,
} from "@/lib/booking";
import {
  sendOwnerNewBooking,
  sendWhatsappButtons,
  sendWhatsappCtaUrl,
  sendWhatsappList,
  sendWhatsappText,
} from "@/lib/whatsapp";

/**
 * The WhatsApp demo-booking conversation.
 *
 * A visitor taps "Book on WhatsApp" on a customer's site and lands in chat with
 * a prefilled message naming the project. Because THEY message first, Meta's
 * 24-hour service window is open and every line below can be free text or a
 * native picker — no approved template needed for the conversation itself.
 *
 * State lives in `WhatsappThread` because WhatsApp has none of its own: each
 * inbound message is a number and some text, and without a stored step the bot
 * would forget what it just asked.
 *
 * Deliberately a fixed script rather than an AI reading intent: a misread
 * "Thursday" books a real client call at the wrong hour on someone else's
 * calendar, and every tap here carries a machine-readable id instead.
 */

const DAYS_AHEAD = 15;
/** Meta's hard cap on list rows. One is spent on "More dates". */
const MAX_ROWS = 10;
const DATE_ROWS = MAX_ROWS - 1;

/** Ids we hand to WhatsApp and get back on the tap. */
const ID = {
  project: (repoId: string) => `p:${repoId}`,
  date: (iso: string) => `d:${iso}`,
  time: (iso: string) => `t:${iso}`,
  moreDates: "more-dates",
  /** Which upcoming demo a Reschedule/Cancel tap referred to. */
  pickBooking: (action: "r" | "c", bookingId: string) => `b:${action}:${bookingId}`,
  confirmCancel: (bookingId: string) => `cc:${bookingId}`,
  keepBooking: "keep-booking",
};

function fmtDay(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function fmtTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Calendar day in the project's zone, as `YYYY-MM-DD`. */
function dayKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function threadFor(phone: string) {
  return prisma.whatsappThread.upsert({
    where: { phone },
    create: { phone, lastInboundAt: new Date() },
    update: { lastInboundAt: new Date() },
  });
}

/**
 * Projects this number could plausibly mean.
 *
 * A known client is offered what they have engaged with before; a cold number
 * gets every bookable project. Either way the bot asks rather than guessing —
 * booking a PracticeStack demo against a library project files the recording in
 * the wrong place and nobody notices until they go looking for it.
 */
async function candidateProjects(phone: string) {
  const client = await prisma.client.findUnique({
    where: { phone },
    include: {
      projects: {
        include: { repo: { select: { id: true, name: true, bookingPage: true } } },
        orderBy: { lastSeenAt: "desc" },
      },
    },
  });

  const known = (client?.projects ?? [])
    .map((p) => p.repo)
    .filter((r) => r.bookingPage?.enabled);
  if (known.length > 0) return { client, projects: known };

  const all = await prisma.repo.findMany({
    where: { bookingPage: { enabled: true } },
    select: { id: true, name: true, bookingPage: true },
    take: MAX_ROWS,
  });
  return { client, projects: all };
}

type SlotsResult =
  | { ok: false; error: string }
  | {
      ok: true;
      page: NonNullable<Awaited<ReturnType<typeof prisma.bookingPage.findUnique>>>;
      connectionId: string;
      days: Map<string, Date[]>;
    };

/**
 * Which Google account this project's demos live on.
 *
 * Same rule as the website path: the project's chosen calendar, falling back to
 * the oldest connection. Two code paths disagreeing about which calendar a
 * project uses would book demos into two different Google accounts.
 *
 * Separate from `slotsByDay` because cancelling has to work on a project whose
 * booking page has since been switched off — the demo on the calendar is real
 * whatever the page says now, and refusing to delete it because no new bookings
 * are being taken would leave the client with a call nobody attends.
 */
async function connectionFor(repoId: string): Promise<{ id: string } | null> {
  const [page, owner] = await Promise.all([
    prisma.bookingPage.findUnique({
      where: { repoId },
      select: { calendarConnectionId: true },
    }),
    prisma.repo.findUnique({ where: { id: repoId }, select: { userId: true } }),
  ]);
  if (!owner) return null;

  if (page?.calendarConnectionId) {
    return prisma.calendarConnection.findFirst({
      where: { id: page.calendarConnectionId, userId: owner.userId },
      select: { id: true },
    });
  }
  return prisma.calendarConnection.findFirst({
    where: { userId: owner.userId },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Slots for a project, grouped by calendar day in the project's zone.
 *
 * An explicit `ok` discriminant rather than "does it have an error key":
 * TypeScript widens the latter into `string | undefined` at every call site,
 * and the compiler stops being able to tell the two shapes apart.
 */
async function slotsByDay(repoId: string): Promise<SlotsResult> {
  const page = await prisma.bookingPage.findUnique({ where: { repoId } });
  if (!page?.enabled) return { ok: false, error: "Booking is not enabled for this project" };

  const connection = await connectionFor(repoId);
  if (!connection) return { ok: false, error: "This project has no calendar connected" };

  const availability = await getAvailability({
    repoId,
    connectionId: connection.id,
    from: new Date(),
    to: new Date(Date.now() + DAYS_AHEAD * 86400_000),
  });
  if ("error" in availability) return { ok: false, error: availability.error };

  const days = new Map<string, Date[]>();
  for (const slot of availability.slots) {
    const start = new Date(slot.startsAt);
    const key = dayKey(start, page.timezone);
    days.set(key, [...(days.get(key) ?? []), start]);
  }

  return { ok: true, page, connectionId: connection.id, days };
}

async function askProject(phone: string, threadId: string) {
  const { projects } = await candidateProjects(phone);

  if (projects.length === 0) {
    await sendWhatsappText(phone, "Sorry — no demos are open for booking right now.");
    return;
  }

  if (projects.length === 1) {
    await prisma.whatsappThread.update({
      where: { id: threadId },
      data: { repoId: projects[0].id, step: "CHOOSE_DATE", datePage: 0 },
    });
    await askDate(phone, threadId, projects[0].id, 0);
    return;
  }

  await prisma.whatsappThread.update({
    where: { id: threadId },
    data: { step: "CHOOSE_PROJECT" },
  });
  await sendWhatsappList({
    phone,
    body: "Which one would you like a demo of?",
    buttonLabel: "Choose",
    rows: projects.slice(0, MAX_ROWS).map((p) => ({ id: ID.project(p.id), title: p.name })),
  });
}

async function askDate(phone: string, threadId: string, repoId: string, page: number) {
  const result = await slotsByDay(repoId);
  if (!result.ok) {
    await sendWhatsappText(phone, result.error);
    return;
  }

  const keys = [...result.days.keys()].sort();
  if (keys.length === 0) {
    await sendWhatsappText(
      phone,
      "There are no free slots in the next two weeks. Reply here and we'll sort something out."
    );
    return;
  }

  const start = page * DATE_ROWS;
  const slice = keys.slice(start, start + DATE_ROWS);
  if (slice.length === 0) {
    // Paged past the end — wrap rather than showing an empty picker.
    await askDate(phone, threadId, repoId, 0);
    return;
  }

  const rows = slice.flatMap((key) => {
    const daySlots = result.days.get(key) ?? [];
    // Keys come from this same map, so an empty day means it emptied between
    // building the list and reading it — drop the row rather than offer a day
    // with nothing on it.
    if (daySlots.length === 0) return [];
    return [
      {
        id: ID.date(key),
        title: fmtDay(daySlots[0], result.page.timezone),
        description: `${daySlots.length} slot${daySlots.length === 1 ? "" : "s"} free`,
      },
    ];
  });

  if (start + DATE_ROWS < keys.length) {
    rows.push({ id: ID.moreDates, title: "More dates →", description: "See later days" });
  }

  await prisma.whatsappThread.update({
    where: { id: threadId },
    data: { step: "CHOOSE_DATE", repoId, datePage: page },
  });

  await sendWhatsappList({
    phone,
    body: "Which day suits you?",
    buttonLabel: "Pick a day",
    rows,
    footer: `Times shown in ${result.page.timezone}`,
  });
}

async function askTime(phone: string, threadId: string, repoId: string, day: string) {
  const result = await slotsByDay(repoId);
  if (!result.ok) {
    await sendWhatsappText(phone, result.error);
    return;
  }

  const slots = (result.days.get(day) ?? []).slice(0, MAX_ROWS);
  if (slots.length === 0) {
    await sendWhatsappText(phone, "That day just filled up — pick another.");
    await askDate(phone, threadId, repoId, 0);
    return;
  }

  await prisma.whatsappThread.update({ where: { id: threadId }, data: { step: "CHOOSE_TIME" } });

  await sendWhatsappList({
    phone,
    body: `Times on ${fmtDay(slots[0], result.page.timezone)}`,
    buttonLabel: "Pick a time",
    rows: slots.map((s) => ({
      id: ID.time(s.toISOString()),
      title: fmtTime(s, result.page.timezone),
      description: `${result.page.slotMinutes} minutes`,
    })),
    footer: `Times shown in ${result.page.timezone}`,
  });
}

/**
 * Everything is known — create the demo.
 *
 * No OTP here, unlike the website: the number is already proven, because this
 * whole conversation arrived from it.
 */
async function confirm(phone: string, threadId: string) {
  const thread = await prisma.whatsappThread.findUnique({ where: { id: threadId } });
  if (!thread?.repoId || !thread.pendingStart || !thread.name || !thread.email) {
    // Silence here reads as a broken bot. The guard fires when a detail is
    // missing that the script should already have collected, so say something
    // rather than leaving a tapped slot with no reply.
    await sendWhatsappText(
      phone,
      "Something went wrong holding that slot — send \"book\" and we'll start again."
    );
    return;
  }

  if (thread.rescheduleId) {
    await applyReschedule(phone, threadId, thread.rescheduleId, thread.pendingStart);
    return;
  }

  const result = await slotsByDay(thread.repoId);
  if (!result.ok) {
    await sendWhatsappText(phone, result.error);
    return;
  }

  const repo = await prisma.repo.findUnique({
    where: { id: thread.repoId },
    select: { name: true, userId: true },
  });
  if (!repo) return;

  const endsAt = new Date(thread.pendingStart.getTime() + result.page.slotMinutes * 60_000);

  const client = await prisma.client.upsert({
    where: { phone },
    create: { phone, name: thread.name, email: thread.email },
    update: { name: thread.name, email: thread.email },
  });
  await prisma.clientProject.upsert({
    where: { clientId_repoId: { clientId: client.id, repoId: thread.repoId } },
    create: { clientId: client.id, repoId: thread.repoId },
    update: { lastSeenAt: new Date() },
  });

  let booking;
  try {
    booking = await prisma.booking.create({
      data: {
        pageId: result.page.id,
        repoId: thread.repoId,
        clientId: client.id,
        name: thread.name,
        email: thread.email,
        phone,
        startsAt: thread.pendingStart,
        endsAt,
        timezone: result.page.timezone,
        status: "CONFIRMED",
      },
      select: { id: true },
    });
  } catch {
    // The partial unique index rejected it — someone took the slot mid-chat.
    await sendWhatsappText(phone, "Sorry, that slot was just taken. Let's pick another.");
    await askDate(phone, threadId, thread.repoId, 0);
    return;
  }

  const event = await insertCalendarEvent({
    connectionId: result.connectionId,
    summary: `${repo.name} demo — ${thread.name}`,
    description: `Demo booked over WhatsApp.\n\nName: ${thread.name}\nEmail: ${thread.email}\nWhatsApp: +${phone}`,
    startsAt: thread.pendingStart,
    endsAt,
    attendeeEmail: thread.email,
    attendeeName: thread.name,
    timezone: result.page.timezone,
  });

  if ("error" in event) {
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "EXPIRED" } });
    await sendWhatsappText(phone, `Sorry — ${event.error}. We'll be in touch to sort it out.`);
    return;
  }

  // Demos are always recorded: being able to go back to what was promised on a
  // demo call is the reason this lives in Glitchgrab and not in cal.com.
  const meeting = await prisma.meeting.create({
    data: {
      repoId: thread.repoId,
      title: `${repo.name} demo — ${thread.name}`,
      meetUrl: event.meetUrl,
      startsAt: thread.pendingStart,
      endsAt,
      status: "SCHEDULED",
      recorder: "bot",
      createdById: repo.userId,
    },
    select: { id: true },
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: { calendarEventId: event.eventId, meetUrl: event.meetUrl, meetingId: meeting.id },
  });
  await prisma.whatsappThread.update({
    where: { id: threadId },
    data: { step: "DONE", bookingId: booking.id, pendingStart: null, rescheduleId: null },
  });

  // A button rather than a pasted link: this is the message they come back to
  // when the call starts, and a target beats a paragraph to search through.
  await sendWhatsappCtaUrl({
    phone,
    body:
      `Booked — ${repo.name} demo on ${fmtDay(thread.pendingStart, result.page.timezone)} at ` +
      `${fmtTime(thread.pendingStart, result.page.timezone)}.\n\n` +
      `A calendar invite is on its way to ${thread.email}. We'll remind you before the call.`,
    buttonText: "Join demo",
    url: event.meetUrl,
    footer: result.page.timezone,
  });

  const owner = await prisma.user.findUnique({
    where: { id: repo.userId },
    select: { whatsappPhone: true },
  });
  if (owner?.whatsappPhone) {
    await sendOwnerNewBooking({
      phone: owner.whatsappPhone,
      project: repo.name,
      bookerName: thread.name,
      startsAt: thread.pendingStart,
      timezone: result.page.timezone,
    }).catch(() => {});
  }
}

/*
 * SECURITY: every booking lookup driven by a reply id is
 * `findFirst({ where: { id, phone } })`, never `findUnique({ where: { id } })`.
 *
 * Reply ids arrive from the webhook. The signature proves the message came from
 * Meta — NOT that the id inside it is one we ever sent. Nothing stops a crafted
 * client echoing `cc:<someone else's booking>`, and unscoped that tap would
 * cancel a stranger's client call, or pull their name and email into this
 * thread on the way past. The scope is checked BEFORE any calendar mutation or
 * thread write.
 */

/**
 * Upcoming demos this number could have meant by tapping Reschedule or Cancel.
 *
 * The template button carries no booking id — Meta quick replies return only
 * their own label — so the booking is resolved from the number. Only future
 * CONFIRMED demos count: moving a call that already happened is not a thing
 * anyone means to do.
 */
async function upcomingBookings(phone: string) {
  return prisma.booking.findMany({
    where: { phone, status: "CONFIRMED", startsAt: { gt: new Date() } },
    orderBy: { startsAt: "asc" },
    take: MAX_ROWS,
    select: {
      id: true,
      name: true,
      email: true,
      startsAt: true,
      timezone: true,
      repoId: true,
      repo: { select: { name: true } },
    },
  });
}

/**
 * Start moving a booking: remember which one, then hand over to the date picker.
 *
 * Name and email are seeded from the BOOKING, not from the `Client` table. A
 * website booker may have no `Client` row at all (`Booking.clientId` is
 * nullable), and without this the picker would stop to ask a returning customer
 * their name again mid-reschedule.
 */
async function beginReschedule(phone: string, threadId: string, bookingId: string) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, phone },
    select: { id: true, repoId: true, name: true, email: true, startsAt: true, timezone: true },
  });
  if (!booking) {
    await sendWhatsappText(phone, "That booking is no longer active.");
    return;
  }

  await prisma.whatsappThread.update({
    where: { id: threadId },
    data: {
      rescheduleId: booking.id,
      repoId: booking.repoId,
      name: booking.name,
      email: booking.email,
      step: "CHOOSE_DATE",
      datePage: 0,
      pendingStart: null,
    },
  });

  await sendWhatsappText(
    phone,
    `Let's move your demo from ${fmtDay(booking.startsAt, booking.timezone ?? "Asia/Kolkata")} ` +
      `at ${fmtTime(booking.startsAt, booking.timezone ?? "Asia/Kolkata")}.`
  );
  await askDate(phone, threadId, booking.repoId, 0);
}

/**
 * The move itself.
 *
 * Everything that carries the old time has to follow: the booking row, the
 * Google event, and the `Meeting` the recorder bot works from. Updating the
 * booking alone leaves a bot joining an empty room at the original hour.
 */
async function applyReschedule(
  phone: string,
  threadId: string,
  bookingId: string,
  start: Date
) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, phone },
    select: {
      id: true,
      repoId: true,
      name: true,
      email: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      calendarEventId: true,
      meetUrl: true,
      meetingId: true,
      status: true,
      repo: { select: { name: true, userId: true } },
    },
  });

  if (!booking || booking.status !== "CONFIRMED") {
    await prisma.whatsappThread.update({
      where: { id: threadId },
      data: { rescheduleId: null, pendingStart: null, step: "DONE" },
    });
    await sendWhatsappText(phone, "That booking is no longer active.");
    return;
  }

  const result = await slotsByDay(booking.repoId);
  if (!result.ok) {
    await sendWhatsappText(phone, result.error);
    return;
  }

  const endsAt = new Date(start.getTime() + result.page.slotMinutes * 60_000);
  // Captured verbatim, not recomputed: slot length and timezone are settings
  // the owner may have changed since this was booked, and a rollback that
  // "restores" a different end time is not a rollback.
  const previous = {
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    timezone: booking.timezone,
  };

  try {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { startsAt: start, endsAt, timezone: result.page.timezone },
    });
  } catch {
    // Same partial unique index that guards the create path — someone took the
    // slot while this picker was open.
    await sendWhatsappText(phone, "Sorry, that slot was just taken. Let's pick another.");
    await askDate(phone, threadId, booking.repoId, 0);
    return;
  }

  if (booking.calendarEventId) {
    const patched = await patchCalendarEvent({
      connectionId: result.connectionId,
      eventId: booking.calendarEventId,
      startsAt: start,
      endsAt,
      timezone: result.page.timezone,
    });

    if ("error" in patched) {
      // Put the booking back rather than leave the database claiming a time
      // the calendar never agreed to.
      await prisma.booking
        .update({ where: { id: booking.id }, data: previous })
        .catch(() => {});
      await sendWhatsappText(phone, `Sorry — ${patched.error}. Your original time still stands.`);
      return;
    }
  }

  // The recorder bot is dispatched off the meeting, not off the booking.
  if (booking.meetingId) {
    await prisma.meeting
      .update({ where: { id: booking.meetingId }, data: { startsAt: start, endsAt } })
      .catch(() => {});
  }

  // Reschedules commonly happen AFTER the reminder has gone out — that is what
  // the Reschedule button on `demo_reminder` is for. Leaving the flag set means
  // the new time never gets one.
  await prisma.booking.update({
    where: { id: booking.id },
    data: { reminderSentAt: null },
  });

  await prisma.whatsappThread.update({
    where: { id: threadId },
    data: { step: "DONE", rescheduleId: null, pendingStart: null, bookingId: booking.id },
  });

  const when = `${fmtDay(start, result.page.timezone)} at ${fmtTime(start, result.page.timezone)}`;

  if (booking.meetUrl) {
    await sendWhatsappCtaUrl({
      phone,
      body: `Moved — your ${booking.repo.name} demo is now ${when}.\n\nThe calendar invite has been updated. Same joining link as before.`,
      buttonText: "Join demo",
      url: booking.meetUrl,
      footer: result.page.timezone,
    });
  } else {
    await sendWhatsappText(phone, `Moved — your ${booking.repo.name} demo is now ${when}.`);
  }

  const owner = await prisma.user.findUnique({
    where: { id: booking.repo.userId },
    select: { whatsappPhone: true },
  });
  if (owner?.whatsappPhone) {
    await sendWhatsappText(
      owner.whatsappPhone,
      `${booking.name} moved their ${booking.repo.name} demo to ${when} (${result.page.timezone}).`
    ).catch(() => {});
  }
}

/**
 * Ask before cancelling.
 *
 * One tap in a chat app should not destroy a real client call — the thumb that
 * meant "Join demo" is a centimetre from the one that means "Cancel". Free to
 * ask, because the tap that got us here opened the 24-hour window.
 */
async function askCancelConfirm(phone: string, bookingId: string) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, phone },
    select: {
      startsAt: true,
      timezone: true,
      status: true,
      repo: { select: { name: true } },
    },
  });

  if (!booking || booking.status !== "CONFIRMED") {
    await sendWhatsappText(phone, "That booking is no longer active.");
    return;
  }

  const zone = booking.timezone ?? "Asia/Kolkata";
  await sendWhatsappButtons({
    phone,
    body:
      `Cancel your ${booking.repo.name} demo on ${fmtDay(booking.startsAt, zone)} ` +
      `at ${fmtTime(booking.startsAt, zone)}?`,
    buttons: [
      { id: ID.confirmCancel(bookingId), title: "Yes, cancel" },
      { id: ID.keepBooking, title: "Keep it" },
    ],
  });
}

/**
 * Cancel for real.
 *
 * Written to survive being run twice: Meta retries the webhook whenever we
 * answer non-200, and a half-applied cancellation — booking marked CANCELLED,
 * Google event still standing — is worse than either outcome.
 */
async function applyCancel(phone: string, threadId: string, bookingId: string) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, phone },
    select: {
      id: true,
      repoId: true,
      name: true,
      startsAt: true,
      timezone: true,
      status: true,
      calendarEventId: true,
      meetingId: true,
      repo: { select: { name: true, userId: true } },
    },
  });
  if (!booking) {
    await sendWhatsappText(phone, "That booking is no longer active.");
    return;
  }

  const zone = booking.timezone ?? "Asia/Kolkata";
  const when = `${fmtDay(booking.startsAt, zone)} at ${fmtTime(booking.startsAt, zone)}`;

  if (booking.calendarEventId) {
    const connection = await connectionFor(booking.repoId);
    if (!connection) {
      await sendWhatsappText(
        phone,
        "Sorry — we couldn't reach the calendar. Your demo is still booked; reply here and we'll sort it out."
      );
      return;
    }
    const removed = await cancelCalendarEvent({
      connectionId: connection.id,
      eventId: booking.calendarEventId,
    });
    if ("error" in removed) {
      // Bail BEFORE marking it cancelled. A booking marked CANCELLED with the
      // event still standing means the owner keeps a call nobody will attend
      // and the client believes it is off.
      await sendWhatsappText(
        phone,
        `Sorry — ${removed.error}. Your demo is still booked; reply here and we'll sort it out.`
      );
      return;
    }
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED" },
  });

  if (booking.meetingId) {
    await prisma.meeting
      .update({ where: { id: booking.meetingId }, data: { status: "CANCELLED" } })
      .catch(() => {});
  }

  // `syncCalendar` only ever upserts events Google still returns — it never
  // removes a row for one that vanished. Without this the recorder bot is still
  // dispatched, and joins a meeting that no longer exists.
  if (booking.calendarEventId) {
    await prisma.scheduledRecording
      .updateMany({
        where: { calendarEventId: booking.calendarEventId, status: "PENDING" },
        data: { status: "SKIPPED", error: "Booking cancelled by the client" },
      })
      .catch(() => {});
  }

  await prisma.whatsappThread.update({
    where: { id: threadId },
    data: { step: "DONE", rescheduleId: null, pendingStart: null },
  });

  await sendWhatsappText(
    phone,
    `Cancelled — your ${booking.repo.name} demo on ${when} is off the calendar. ` +
      `Send "book" whenever you'd like another.`
  );

  const owner = await prisma.user.findUnique({
    where: { id: booking.repo.userId },
    select: { whatsappPhone: true },
  });
  if (owner?.whatsappPhone) {
    await sendWhatsappText(
      owner.whatsappPhone,
      `${booking.name} cancelled their ${booking.repo.name} demo on ${when} (${zone}).`
    ).catch(() => {});
  }
}

/**
 * A Reschedule or Cancel tap on one of our templates.
 *
 * Separate from `handleBookingMessage` on purpose: routed through that as plain
 * text, "Reschedule" matches no picker id, is not a restart word, and falls
 * through to `askProject` — starting a brand new booking instead of moving the
 * existing one.
 */
export async function handleBookingAction(params: {
  phone: string;
  action: "reschedule" | "cancel";
}): Promise<void> {
  const phone = params.phone.replace(/\D/g, "");
  const thread = await threadFor(phone);
  const bookings = await upcomingBookings(phone);

  if (bookings.length === 0) {
    await sendWhatsappText(
      phone,
      'You have no upcoming demos booked. Send "book" to arrange one.'
    );
    return;
  }

  if (bookings.length === 1) {
    if (params.action === "reschedule") {
      await beginReschedule(phone, thread.id, bookings[0].id);
    } else {
      await askCancelConfirm(phone, bookings[0].id);
    }
    return;
  }

  // Several upcoming demos and a button that says only "Reschedule" — the tap
  // cannot say which, so ask rather than guess at someone's calendar.
  await sendWhatsappList({
    phone,
    body: params.action === "reschedule" ? "Which demo would you like to move?" : "Which demo would you like to cancel?",
    buttonLabel: "Choose",
    rows: bookings.map((b) => ({
      id: ID.pickBooking(params.action === "reschedule" ? "r" : "c", b.id),
      title: b.repo.name,
      description: `${fmtDay(b.startsAt, b.timezone ?? "Asia/Kolkata")} at ${fmtTime(b.startsAt, b.timezone ?? "Asia/Kolkata")}`,
    })),
  });
}

/**
 * Drive the conversation one inbound message forward.
 *
 * `listReplyId` is set when they tapped a picker row; `text` when they typed.
 * Taps are preferred everywhere a choice matters — typed text is only trusted
 * for a name and an email, where there is nothing to mis-parse into a wrong
 * booking.
 */
export async function handleBookingMessage(params: {
  phone: string;
  text?: string;
  listReplyId?: string;
}): Promise<void> {
  const phone = params.phone.replace(/\D/g, "");
  const text = params.text?.trim() ?? "";
  const reply = params.listReplyId ?? "";
  const thread = await threadFor(phone);

  // Start over on request, or when a finished thread says anything new.
  const restarting = /^(hi|hello|hey|start|book|demo|menu)\b/i.test(text) || thread.step === "DONE";

  // Abandoning a half-finished move has to drop the marker with it. Left set,
  // the next booking this number makes would patch the old demo instead of
  // creating a new one — and the original time would vanish without anyone
  // asking for that.
  if (restarting && thread.rescheduleId) {
    await prisma.whatsappThread.update({
      where: { id: thread.id },
      data: { rescheduleId: null, pendingStart: null },
    });
    thread.rescheduleId = null;
  }

  // Reschedule / cancel taps, and the picker rows they lead to. Checked before
  // everything else: these carry a booking id, and the booking flow below would
  // read them as an ordinary project or date choice.
  if (reply.startsWith("b:")) {
    const [, action, bookingId] = reply.split(":");
    if (bookingId) {
      if (action === "r") await beginReschedule(phone, thread.id, bookingId);
      else await askCancelConfirm(phone, bookingId);
    }
    return;
  }

  if (reply.startsWith("cc:")) {
    await applyCancel(phone, thread.id, reply.slice(3));
    return;
  }

  if (reply === ID.keepBooking) {
    await sendWhatsappText(phone, "No change — your demo is still booked.");
    return;
  }

  // Typed "cancel" — there is deliberately NO Cancel button on any template.
  // Offering one invites the tap: it sits under a message the client is already
  // reading, and the easiest way out of "I can't make Tuesday" becomes calling
  // the whole thing off rather than moving it. Someone who genuinely wants out
  // will say so, and this catches them; the reschedule path stays the only one
  // we advertise.
  if (/^cancel\b/i.test(text)) {
    await handleBookingAction({ phone, action: "cancel" });
    return;
  }

  // Typed "reschedule" gets the same treatment, so the word works whether it
  // arrived as a tap or as text.
  if (/^reschedul/i.test(text)) {
    await handleBookingAction({ phone, action: "reschedule" });
    return;
  }

  if (reply.startsWith("p:")) {
    const repoId = reply.slice(2);
    await prisma.whatsappThread.update({
      where: { id: thread.id },
      data: { repoId, step: "CHOOSE_DATE", datePage: 0 },
    });
    await askDate(phone, thread.id, repoId, 0);
    return;
  }

  if (reply === ID.moreDates && thread.repoId) {
    await askDate(phone, thread.id, thread.repoId, thread.datePage + 1);
    return;
  }

  if (reply.startsWith("d:") && thread.repoId) {
    await askTime(phone, thread.id, thread.repoId, reply.slice(2));
    return;
  }

  if (reply.startsWith("t:") && thread.repoId) {
    const start = new Date(reply.slice(2));

    // Mid-reschedule the name and email are already seeded from the booking,
    // and a website booker has no `Client` row to look them up in — asking a
    // returning customer for their name again is how a move turns into a form.
    if (thread.rescheduleId) {
      await prisma.whatsappThread.update({
        where: { id: thread.id },
        data: { pendingStart: start },
      });
      await confirm(phone, thread.id);
      return;
    }

    const client = await prisma.client.findUnique({ where: { phone } });

    await prisma.whatsappThread.update({
      where: { id: thread.id },
      data: {
        pendingStart: start,
        name: client?.name ?? thread.name,
        email: client?.email ?? thread.email,
        step: client?.name ? (client.email ? "DONE" : "ASK_EMAIL") : "ASK_NAME",
      },
    });

    // A returning client has already told us who they are — asking again is
    // how a booking flow feels like a form instead of a conversation.
    if (client?.name && client.email) {
      await confirm(phone, thread.id);
      return;
    }
    await sendWhatsappText(
      phone,
      client?.name ? "What's the best email for the calendar invite?" : "What's your name?"
    );
    return;
  }

  if (thread.step === "ASK_NAME" && text && !restarting) {
    await prisma.whatsappThread.update({
      where: { id: thread.id },
      data: { name: text.slice(0, 80), step: "ASK_EMAIL" },
    });
    await sendWhatsappText(phone, "Thanks. What's the best email for the calendar invite?");
    return;
  }

  if (thread.step === "ASK_EMAIL" && text && !restarting) {
    if (!text.includes("@")) {
      await sendWhatsappText(phone, "That doesn't look like an email — could you send it again?");
      return;
    }
    await prisma.whatsappThread.update({
      where: { id: thread.id },
      data: { email: text.slice(0, 160), step: "DONE" },
    });
    await confirm(phone, thread.id);
    return;
  }

  // Anything else: work out which project this is about and begin.
  //
  // The deep link from a customer's site prefills a code, so most conversations
  // never see the project question at all.
  const code = /\bdemo[:\s-]+([a-z0-9-]{2,40})\b/i.exec(text)?.[1]?.toLowerCase();
  if (code) {
    const page = await prisma.bookingPage.findFirst({
      where: { whatsappCode: code, enabled: true },
      select: { repoId: true },
    });
    if (page) {
      await prisma.whatsappThread.update({
        where: { id: thread.id },
        data: { repoId: page.repoId, step: "CHOOSE_DATE", datePage: 0, pendingStart: null },
      });
      await askDate(phone, thread.id, page.repoId, 0);
      return;
    }
  }

  await askProject(phone, thread.id);
}
