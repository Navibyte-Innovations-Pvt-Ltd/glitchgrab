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

  // The bot calls us back on this to report progress and upload the audio, so
  // it must be an address the BOT can reach — not one that merely works here.
  const apiBase =
    process.env.MEET_BOT_CALLBACK_URL ?? process.env.NEXTAUTH_URL ?? "https://glitchgrab.dev";

  const botIsLocal = /localhost|127\.0\.0\.1/.test(botUrl);
  const callbackIsLocal = /localhost|127\.0\.0\.1/.test(apiBase);

  // A remote bot told to call back to localhost resolves that to its OWN
  // container. It joins the call, records for the full hour, and posts every
  // status update and the finished audio into nothing — so the meeting looks
  // like it is being recorded, the badge sits waiting forever, and the file
  // never arrives. Refusing up front is worth far more than a bot that appears
  // to work: the failure is otherwise invisible until someone goes looking for
  // a transcript that was never coming.
  if (!botIsLocal && callbackIsLocal) {
    return {
      ok: false,
      error:
        "The bot runs remotely and cannot reach localhost. Run `bun run tunnel`, " +
        "put the https URL in MEET_BOT_CALLBACK_URL, and restart the dev server — " +
        "or use glitchgrab.dev instead.",
    };
  }

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
 * Ask the bot service what it is doing with a meeting, right now.
 *
 * The bot reports its progress by calling us, which is the wrong direction to
 * depend on: any network where the bot cannot reach us produces a bot that
 * joins the call and records while the dashboard shows it as still joining,
 * forever. Asking the other way round works whenever the bot service is
 * reachable from here — which it must be anyway, or we could not have
 * dispatched it in the first place.
 *
 * Returns null on any problem: this is a better answer than the stored one,
 * never a required one.
 */
export async function fetchLiveBotPhase(meetingId: string): Promise<string | null> {
  const botUrl = process.env.MEET_BOT_URL;
  const secret = process.env.MEET_BOT_SECRET;
  if (!botUrl || !secret) return null;

  try {
    const res = await fetch(`${botUrl.replace(/\/$/, "")}/status`, {
      headers: { "x-gg-bot": secret },
      // A status read must never hold up the caller — the stored value is
      // right behind it.
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      data?: { jobs?: Array<{ meetingId?: string; phase?: string }> };
    };
    return json.data?.jobs?.find((j) => j.meetingId === meetingId)?.phase ?? null;
  } catch {
    return null;
  }
}

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

/**
 * Create the Meeting row and send the bot to it.
 *
 * The row exists before the bot is asked to do anything, so a bot that never
 * arrives still leaves a visible, explainable record instead of silence.
 */
export async function startBotRecording(params: {
  /** Null for an unfiled recording — file it later with PATCH /meetings/:id/repo. */
  repoId: string | null;
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
