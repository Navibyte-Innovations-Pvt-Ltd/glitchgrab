import { runBotJob } from "./job";

/**
 * The Meet bot service (#311).
 *
 * A tiny HTTP front door over `runBotJob`. Glitchgrab POSTs a meeting here and
 * the bot goes and sits in the call.
 *
 * This is NOT deployable to Vercel or any function platform: a job runs for the
 * length of a meeting and needs a real browser plus a sound server. Run the
 * Docker image on a container host.
 */

const PORT = Number(process.env.PORT ?? 8080);

/** Shared secret. The bot is infrastructure, not a user — no session involved. */
const SECRET = process.env.MEET_BOT_SECRET ?? "";

/** The name your client sees in the participant list. Say what it is. */
const BOT_NAME = process.env.MEET_BOT_NAME ?? "Glitchgrab Notetaker";

/**
 * One browser per meeting is roughly 1–2 vCPU and ~1 GB, so this is a real
 * ceiling rather than a formality — oversubscribing degrades every call at
 * once, and a degraded recording is worse than a refused one.
 */
const MAX_CONCURRENT = Number(process.env.MEET_BOT_MAX_CONCURRENT ?? 2);

const active = new Set<string>();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Bun.serve({
  port: PORT,
  idleTimeout: 60,

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true, active: active.size, capacity: MAX_CONCURRENT });
    }

    if (url.pathname !== "/join" || request.method !== "POST") {
      return json({ success: false, error: "Not found" }, 404);
    }

    if (!SECRET || request.headers.get("x-gg-bot") !== SECRET) {
      return json({ success: false, error: "Unauthorized" }, 401);
    }

    const body = (await request.json().catch(() => ({}))) as {
      meetingId?: string;
      meetUrl?: string;
      apiBase?: string;
    };

    if (!body.meetingId || !body.meetUrl || !body.apiBase) {
      return json({ success: false, error: "meetingId, meetUrl and apiBase are required" }, 400);
    }

    // Only Google Meet. Anything else is either a typo or an attempt to point
    // the bot at an arbitrary page.
    if (!/^https:\/\/meet\.google\.com\//.test(body.meetUrl)) {
      return json({ success: false, error: "Only Google Meet links are supported" }, 400);
    }

    if (active.has(body.meetingId)) {
      return json({ success: false, error: "Already recording this meeting" }, 409);
    }

    if (active.size >= MAX_CONCURRENT) {
      return json({ success: false, error: "All bots are busy" }, 429);
    }

    active.add(body.meetingId);

    // Fire and forget: the caller must not wait out an hour-long meeting.
    void runBotJob({
      meetingId: body.meetingId,
      meetUrl: body.meetUrl,
      apiBase: body.apiBase,
      secret: SECRET,
      botName: BOT_NAME,
    })
      .catch((err) => console.error("[bot] job crashed:", err))
      .finally(() => active.delete(body.meetingId as string));

    return json({ success: true, data: { meetingId: body.meetingId, status: "JOINING" } });
  },
});

console.log(`[bot] listening on :${PORT} (capacity ${MAX_CONCURRENT})`);
