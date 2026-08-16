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
const BOT_IN_FLIGHT = ["DISPATCHING", "JOINING", "WAITING_ADMIT", "RECORDING", "UPLOADING"];

/**
 * Is a bot already handling this Meet link?
 *
 * Two bots joining one call is not a silent duplicate — the client watches two
 * notetakers arrive. Easy to cause: paste a link twice, or paste one for a call
 * that is also in the calendar with auto-record on.
 */
export async function botAlreadyOnCall(meetUrl: string): Promise<boolean> {
  const existing = await prisma.meeting.findFirst({
    where: {
      meetUrl,
      recorder: "bot",
      botStatus: { in: BOT_IN_FLIGHT },
      // Bounded so a row wedged by a crashed bot doesn't block that link forever.
      createdAt: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) },
    },
    select: { id: true },
  });
  return Boolean(existing);
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
