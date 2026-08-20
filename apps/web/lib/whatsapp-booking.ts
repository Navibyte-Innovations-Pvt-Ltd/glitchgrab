import { prisma } from "@/lib/db";
import { getAvailability, insertCalendarEvent } from "@/lib/booking";
import {
  sendOwnerNewBooking,
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
 * Slots for a project, grouped by calendar day in the project's zone.
 *
 * An explicit `ok` discriminant rather than "does it have an error key":
 * TypeScript widens the latter into `string | undefined` at every call site,
 * and the compiler stops being able to tell the two shapes apart.
 */
async function slotsByDay(repoId: string): Promise<SlotsResult> {
  const page = await prisma.bookingPage.findUnique({ where: { repoId } });
  if (!page?.enabled) return { ok: false, error: "Booking is not enabled for this project" };

  const owner = await prisma.repo.findUnique({
    where: { id: repoId },
    select: { userId: true },
  });
  const connection = owner
    ? await prisma.calendarConnection.findFirst({
        where: { userId: owner.userId },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      })
    : null;
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
  if (!thread?.repoId || !thread.pendingStart || !thread.name || !thread.email) return;

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
    data: { step: "DONE", bookingId: booking.id, pendingStart: null },
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
