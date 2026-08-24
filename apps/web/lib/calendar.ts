import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encrypt";

/**
 * Google Calendar → auto-record (#311).
 *
 * Replaces the cal.com path outright. The demos already live in Google Calendar
 * with a Meet link attached, so that IS the schedule — there is nothing new for
 * anyone to book through, and no second system to keep in sync.
 *
 * Reuses the existing `GOOGLE_CLIENT_ID`/`SECRET` (already set up for Search
 * Console) and the same token-refresh shape as `lib/gsc.ts`.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

/** Write: booking creates events, and the bot is added to their guest list. */
const SCOPES = [
  // Write, not readonly: demo booking creates the event and its Meet link on
  // the owner's calendar. An existing connection granted before this change
  // has only the read scope — Google returns 403 on insert, and the fix is a
  // reconnect, so `insertCalendarEvent` says exactly that rather than failing
  // with a raw API error.
  "https://www.googleapis.com/auth/calendar.events",
  // Free/busy, so offered slots reflect the owner's real day rather than a
  // guess. Reading events is not enough — other calendars can hold them.
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/userinfo.email",
];

/** True when a connection predates the write scope and must be reconnected. */
export function isScopeError(status: number, body: string): boolean {
  return status === 403 && /insufficient|scope|permission/i.test(body);
}

function signState(payload: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "").update(payload).digest("hex");
}

/** Cookie carrying the nonce that ties an OAuth state to THIS browser. */
export const CALENDAR_STATE_COOKIE = "gg_calendar_oauth";

/**
 * Begin the connect flow.
 *
 * Returns the nonce alongside the URL: the caller must set it as an httpOnly
 * cookie. A signed state alone is not enough — it proves *we* minted it, not
 * that the browser finishing the flow is the browser that started it. Without
 * the binding an attacker can mint a state for their own account, send the
 * victim the consent link, and have the victim's Google tokens stored under the
 * attacker's user — handing them the victim's calendar.
 */
/**
 * Start the OAuth dance.
 *
 * `inviteId` is set when the person connecting is NOT the account holder — a
 * client attaching their own Gmail through a one-time link. The invite id
 * travels inside the signed state so the callback can attach the connection to
 * the right account without that person ever having a session here.
 */
export function buildCalendarAuthUrl(
  userId: string,
  inviteId?: string
): { url: string; nonce: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "";
  const nonce = randomBytes(32).toString("base64url");
  const payload = JSON.stringify({ userId, nonce, ts: Date.now(), inviteId });
  const state = Buffer.from(
    JSON.stringify({ payload, sig: signState(payload) })
  ).toString("base64url");

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: `${appUrl}/api/v1/calendar/callback`,
    response_type: "code",
    scope: SCOPES.join(" "),
    // Without offline + consent Google returns no refresh token, and the
    // connection silently dies an hour later.
    access_type: "offline",
    prompt: "select_account consent",
    state,
  });

  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, nonce };
}

/** Constant-time string compare — a nonce check must not leak by timing. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Verify the state parameter and recover the user it was minted for.
 *
 * Three things must all hold: the signature is ours, the state is fresh, and
 * the nonce matches the cookie set when the flow began. The cookie is what
 * proves the browser completing the flow is the one that started it.
 */
export function parseCalendarState(
  state: string,
  cookieNonce: string | undefined
): { userId: string; inviteId?: string } | null {
  try {
    const { payload, sig } = JSON.parse(Buffer.from(state, "base64url").toString()) as {
      payload: string;
      sig: string;
    };
    if (!safeEqual(signState(payload), sig)) return null;

    const { userId, nonce, ts, inviteId } = JSON.parse(payload) as {
      userId: string;
      nonce?: string;
      ts: number;
      inviteId?: string;
    };

    // A stale state is a replay, not a slow user.
    if (!userId || Date.now() - ts > 15 * 60 * 1000) return null;

    // No nonce means a state minted before this binding existed, or one forged
    // without it — either way it is not usable.
    if (!nonce || !cookieNonce || !safeEqual(nonce, cookieNonce)) return null;

    return { userId, inviteId };
  } catch {
    return null;
  }
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export async function exchangeCalendarCode(code: string): Promise<TokenResponse> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "";

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: `${appUrl}/api/v1/calendar/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) throw new Error(`Calendar token exchange failed: ${await res.text()}`);
  return (await res.json()) as TokenResponse;
}

/** Which Google account this is — shown in the dashboard so it's obvious. */
export async function fetchGoogleEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return "";
  const data = (await res.json()) as { email?: string };
  return data.email ?? "";
}

/**
 * A usable access token, refreshing it first if it is expired or close to it.
 * Tokens are stored encrypted (AES-256-GCM), same as the Search Console ones.
 */
export async function getAccessToken(connectionId: string): Promise<string | null> {
  const connection = await prisma.calendarConnection.findUnique({
    where: { id: connectionId },
    select: {
      id: true,
      encryptedAccessToken: true,
      encryptedRefreshToken: true,
      tokenExpiresAt: true,
    },
  });
  if (!connection) return null;

  const stillValid =
    connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() - Date.now() > 60_000;
  if (stillValid) {
    try {
      return decrypt(connection.encryptedAccessToken);
    } catch {
      /* fall through to a refresh */
    }
  }

  if (!connection.encryptedRefreshToken) return null;

  try {
    const refreshToken = decrypt(connection.encryptedRefreshToken);
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { access_token: string; expires_in: number };

    await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: {
        encryptedAccessToken: encrypt(data.access_token),
        tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      },
    });

    return data.access_token;
  } catch {
    return null;
  }
}

interface CalendarEvent {
  id: string;
  title: string | null;
  meetUrl: string;
  startsAt: Date;
  endsAt: Date | null;
  attendees: { name?: string; email?: string }[];
}

interface GoogleEvent {
  id?: string;
  status?: string;
  summary?: string;
  hangoutLink?: string;
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { email?: string; displayName?: string; self?: boolean }[];
}

/** Pull the Meet link out of an event, whichever field carries it. */
function meetLinkOf(event: GoogleEvent): string | null {
  if (event.hangoutLink) return event.hangoutLink;

  const entry = event.conferenceData?.entryPoints?.find(
    (e) => e.entryPointType === "video" && e.uri?.includes("meet.google.com")
  );
  return entry?.uri ?? null;
}

/**
 * Upcoming events that actually have a Meet link.
 *
 * Everything else is noise for this feature: an event with no Meet link is not
 * a call the bot can join, and an all-day event has no start time to fire on.
 */
async function listUpcomingMeetings(
  connectionId: string,
  windowHours = 24
): Promise<CalendarEvent[]> {
  const token = await getAccessToken(connectionId);
  if (!token) return [];

  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    timeMax: new Date(Date.now() + windowHours * 3600_000).toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });

  const res = await fetch(`${CALENDAR_API}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return [];

  const data = (await res.json()) as { items?: GoogleEvent[] };

  const events: CalendarEvent[] = [];
  for (const item of data.items ?? []) {
    if (!item.id || item.status === "cancelled") continue;

    const meetUrl = meetLinkOf(item);
    if (!meetUrl) continue;

    // All-day events carry `date` instead of `dateTime` and have no moment to
    // dispatch against.
    const start = item.start?.dateTime;
    if (!start) continue;

    events.push({
      id: item.id,
      title: item.summary ?? null,
      meetUrl,
      startsAt: new Date(start),
      endsAt: item.end?.dateTime ? new Date(item.end.dateTime) : null,
      attendees: (item.attendees ?? [])
        .filter((a) => !a.self)
        .map((a) => ({ name: a.displayName, email: a.email })),
    });
  }

  return events;
}

/**
 * Put the bot on the guest list before it knocks (#311).
 *
 * Since Google's safeguarded guest admit flow (March 2026) a knocking guest
 * lands in one of two queues: **confirmed** — already on the invite or in the
 * host's organisation, default Admit — or **potential risks**, default *Deny*,
 * which is where every uninvited notetaker bot goes. The host then has to
 * override a red warning every single call, and one careless "Deny all" loses
 * the recording. Being an attendee is the documented way out, and it is what
 * the notetakers that join cleanly (tl;dv and friends) actually do.
 *
 * It also makes the invite itself the consent record: the client sees the
 * notetaker on the guest list before the call rather than meeting it in the
 * room.
 *
 * Best effort by design — a bot that is merely knocking still records once
 * admitted, so nothing here may throw the dispatch away.
 */
export async function inviteBotToEvent(
  connectionId: string,
  calendarEventId: string
): Promise<{ ok: boolean; reason?: string }> {
  const botEmail = process.env.MEET_BOT_EMAIL;
  if (!botEmail) return { ok: false, reason: "MEET_BOT_EMAIL is not set" };

  const token = await getAccessToken(connectionId);
  if (!token) return { ok: false, reason: "Calendar connection has no usable token" };

  const eventUrl = `${CALENDAR_API}/calendars/primary/events/${encodeURIComponent(calendarEventId)}`;

  const current = await fetch(eventUrl, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!current.ok) return { ok: false, reason: `Could not read the event (${current.status})` };

  const event = (await current.json()) as GoogleEvent;
  const attendees = event.attendees ?? [];
  if (attendees.some((a) => a.email?.toLowerCase() === botEmail.toLowerCase())) {
    return { ok: true };
  }

  // PATCH replaces the whole attendee list, so the existing guests have to be
  // sent back with it — dropping them would uninvite the actual meeting.
  const res = await fetch(`${eventUrl}?sendUpdates=none`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      attendees: [
        ...attendees,
        { email: botEmail, optional: true, comment: "Notetaker — records this call" },
      ],
    }),
  });

  if (!res.ok) {
    // 403 is the normal failure: only the organiser can edit the guest list, so
    // a call someone else booked simply cannot be pre-authorised this way.
    const body = await res.text().catch(() => "");
    return { ok: false, reason: `Google refused the guest (${res.status}) ${body.slice(0, 200)}` };
  }

  return { ok: true };
}

/**
 * Same thing for a Meet link pasted by hand: find the user's own event for that
 * link, then invite the bot to it. Returns false when the call is not on any
 * calendar we hold — someone else's meeting, which we cannot edit.
 */
export async function inviteBotToMeetUrl(
  userId: string,
  meetUrl: string
): Promise<{ ok: boolean; reason?: string }> {
  const connections = await prisma.calendarConnection.findMany({
    where: { userId },
    select: { id: true },
  });

  const wanted = meetUrl.trim().replace(/\/$/, "");

  for (const connection of connections) {
    const events = await listUpcomingMeetings(connection.id).catch(() => []);
    const match = events.find((e) => e.meetUrl.replace(/\/$/, "") === wanted);
    if (match) return inviteBotToEvent(connection.id, match.id);
  }

  return { ok: false, reason: "That Meet link is not on a calendar we can edit" };
}

/**
 * Mirror the calendar into `ScheduledRecording` rows.
 *
 * Idempotent on the Google event id — the poller runs every few minutes and
 * must never end up sending two bots to the same call. An existing row's repo
 * assignment is preserved: the user may have set it by hand, and a resync
 * must not quietly undo that.
 */
export async function syncCalendar(connectionId: string): Promise<number> {
  const connection = await prisma.calendarConnection.findUnique({
    where: { id: connectionId },
    select: { id: true, defaultRepoId: true },
  });
  if (!connection) return 0;

  const events = await listUpcomingMeetings(connectionId);

  for (const event of events) {
    await prisma.scheduledRecording.upsert({
      where: {
        connectionId_calendarEventId: {
          connectionId: connection.id,
          calendarEventId: event.id,
        },
      },
      create: {
        connectionId: connection.id,
        calendarEventId: event.id,
        repoId: connection.defaultRepoId,
        title: event.title,
        meetUrl: event.meetUrl,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        attendees: event.attendees,
      },
      update: {
        // Times and titles change when a meeting is moved; the repo assignment
        // and status are ours, not Google's.
        title: event.title,
        meetUrl: event.meetUrl,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        attendees: event.attendees,
      },
    });
  }

  await prisma.calendarConnection.update({
    where: { id: connection.id },
    data: { lastSyncAt: new Date() },
  });

  return events.length;
}
