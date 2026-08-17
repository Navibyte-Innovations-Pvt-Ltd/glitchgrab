import { prisma } from "@/lib/db";

/**
 * Dispatching the Meet bot (#311).
 *
 * The bot is a separate long-running service (`packages/meet-bot`) because it
 * needs a real browser and a sound server — it cannot live in a Next.js route.
 * This module is the only thing that talks to it.
 */

interface DispatchResult {
  ok: boolean;
  error?: string;
}

/** Meet links only — anything else is a typo or an attempt to redirect the bot. */
export function isMeetUrl(url: string): boolean {
  return /^https:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(url.trim());
}

/**
 * Ask the bot service to join a meeting.
 *
 * Returns rather than throws: a bot that cannot be reached must leave a legible
 * error on the Meeting row, not a 500 with nothing recorded and nothing said.
 */
async function dispatchBot(params: {
  meetingId: string;
  meetUrl: string;
}): Promise<DispatchResult> {
  const botUrl = process.env.MEET_BOT_URL;
  const secret = process.env.MEET_BOT_SECRET;

  if (!botUrl || !secret) {
    return { ok: false, error: "The meeting bot is not configured (MEET_BOT_URL / MEET_BOT_SECRET)" };
  }

  // The bot calls us back on this to upload — it must be an address the bot's
  // container can actually reach, which is NOT localhost when it runs remotely.
  const apiBase = process.env.NEXTAUTH_URL ?? "https://glitchgrab.dev";

  try {
    const res = await fetch(`${botUrl.replace(/\/$/, "")}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-gg-bot": secret },
      body: JSON.stringify({
        meetingId: params.meetingId,
        meetUrl: params.meetUrl,
        apiBase,
      }),
      // Dispatch is a handshake, not the recording — the bot answers immediately
      // and does the hour-long part on its own.
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: body.error ?? `Bot service said ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not reach the bot service",
    };
  }
}

/**
 * Create the Meeting row and send the bot to it.
 *
 * The row exists before the bot is asked to do anything, so a bot that never
 * arrives still leaves a visible, explainable record instead of silence.
 */
/** States in which a bot is still on (or heading to) the call. */
export const BOT_IN_FLIGHT = [
  "DISPATCHING",
  "JOINING",
  "WAITING_ADMIT",
  "RECORDING",
  "UPLOADING",
];

/**
 * Before a bot is in the room, it is only ever a few seconds from either
 * getting in or failing. A row still claiming DISPATCHING or JOINING ten
 * minutes later is not a bot on a call — it is the wreckage of one that died,
 * was redeployed mid-join, or was never admitted.
 *
 * Those rows used to keep their claim for the full four hours, so a single
 * crashed dispatch locked that Meet link out of recording for the rest of the
 * afternoon: every later attempt got "A bot is already on that call" naming a
 * bot nobody could see, on a call nobody had sent one to.
 */
const PRE_ADMIT_STATES = ["DISPATCHING", "JOINING", "WAITING_ADMIT"];
const PRE_ADMIT_STALE_MS = 10 * 60 * 1000;
/** Recording and uploading legitimately last a long time; only cap the runaway. */
const IN_CALL_STALE_MS = 4 * 60 * 60 * 1000;

/**
 * The bot genuinely working on this Meet link, if there is one.
 *
 * One definition, used both to refuse a duplicate and to let a reloaded tab
 * adopt the recording — if those two disagreed, the button would show nothing
 * running while the server refused to start anything.
 */
export async function findActiveBotMeeting(meetUrl: string, repoIds?: string[]) {
  const now = Date.now();

  return prisma.meeting.findFirst({
    where: {
      meetUrl,
      recorder: "bot",
      ...(repoIds ? { repoId: { in: repoIds } } : {}),
      OR: [
        {
          botStatus: { in: PRE_ADMIT_STATES },
          updatedAt: { gte: new Date(now - PRE_ADMIT_STALE_MS) },
        },
        {
          botStatus: { in: ["RECORDING", "UPLOADING"] },
          createdAt: { gte: new Date(now - IN_CALL_STALE_MS) },
        },
      ],
    },
    select: { id: true, repoId: true, botStatus: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Is a bot already handling this Meet link?
 *
 * Two bots joining one call is not a silent duplicate — the client watches two
 * notetakers arrive. Easy to cause: paste a link twice, or paste one for a call
 * that is also in the calendar with auto-record on.
 */
export async function botAlreadyOnCall(meetUrl: string) {
  return findActiveBotMeeting(meetUrl);
}

export async function startBotRecording(params: {
  repoId: string;
  meetUrl: string;
  title: string | null;
  userId: string | null;
  startsAt?: Date;
}): Promise<{ meetingId: string; dispatch: DispatchResult }> {
  const meeting = await prisma.meeting.create({
    data: {
      repoId: params.repoId,
      title: params.title,
      meetUrl: params.meetUrl,
      startsAt: params.startsAt ?? new Date(),
      status: "RECORDING",
      recorder: "bot",
      botStatus: "DISPATCHING",
      createdById: params.userId,
    },
    select: { id: true },
  });

  const dispatch = await dispatchBot({ meetingId: meeting.id, meetUrl: params.meetUrl });

  if (!dispatch.ok) {
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { botStatus: "FAILED", botError: dispatch.error, status: "FAILED" },
    });
  }

  return { meetingId: meeting.id, dispatch };
}
