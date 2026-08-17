import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getExtensionSessionIdentity, getExtensionSessionRepos } from "@/lib/extension-session";
import { getAccessibleRepos } from "@/lib/repo-access";

/**
 * Shared auth + scoping for meeting recording (#311 Phase B/C).
 *
 * Two callers, one rule. The **extension** authenticates as an
 * `ExtensionSession` (the same identity primitive Report Bug uses); the
 * **dashboard** authenticates as a NextAuth session. Either way the repo scope
 * is derived server-side — a client-supplied `repoId` is only ever used to pick
 * from a list the server built, never trusted on its own.
 */

interface MeetingCaller {
  /** Null for a QA-tester extension session — they have no dashboard user. */
  userId: string | null;
  repos: { id: string; fullName: string }[];
  /**
   * The Meet bot service. It may finish a recording that already exists but
   * can never start one, so it needs no repo scope of its own.
   */
  isBot?: boolean;
}

const BOT_CALLER: MeetingCaller = { userId: null, repos: [], isBot: true };

/**
 * Shared-secret check for the bot service.
 *
 * Compared byte-by-byte over the full length rather than with `===` so the
 * comparison cannot be short-circuited to leak the secret one character at a
 * time.
 */
function isBotRequest(request: Request): boolean {
  const secret = process.env.MEET_BOT_SECRET;
  const provided = request.headers.get("x-gg-bot");
  if (!secret || !provided || provided.length !== secret.length) return false;

  let diff = 0;
  for (let i = 0; i < secret.length; i++) {
    diff |= secret.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Resolve the caller from either auth mechanism.
 *
 * `x-gg-session` is the ExtensionSession id. It is checked first so a developer
 * who is also signed in to the dashboard in the same browser still records
 * against the identity the extension is actually logged in as.
 */
export async function resolveMeetingCaller(request: Request): Promise<MeetingCaller | null> {
  // The bot is infrastructure, not a user: it authenticates with a shared
  // secret and is trusted for every repo, because it only ever acts on a
  // Meeting id that a scoped user already created. It cannot start a recording
  // — only finish one that exists.
  if (isBotRequest(request)) return BOT_CALLER;

  const extensionSessionId = request.headers.get("x-gg-session");

  if (extensionSessionId) {
    const identity = await getExtensionSessionIdentity(extensionSessionId);
    if (!identity) return null;
    const repos = await getExtensionSessionRepos(identity);
    return { userId: identity.userId, repos };
  }

  const session = await auth();
  if (!session?.user?.id) return null;

  // Dashboard readers go through the context access gate — a meeting recording
  // is the most sensitive thing in the product, so "owner or explicit grant"
  // applies here exactly as it does to distilled context.
  const repos = await getAccessibleRepos(session.user.id);
  return {
    userId: session.user.id,
    repos: repos.map((r) => ({ id: r.id, fullName: r.fullName })),
  };
}

/**
 * Null when the repo isn't in the caller's server-derived scope.
 *
 * Always null for the bot: starting a recording is a user action, and the bot
 * having no repo scope is what keeps a leaked secret from creating recordings
 * against arbitrary projects.
 */
export function scopeRepo(caller: MeetingCaller, repoId: string | undefined | null) {
  if (!repoId || caller.isBot) return null;
  return caller.repos.find((r) => r.id === repoId) ?? null;
}

/** Null when the meeting doesn't exist or is outside the caller's scope. */
export async function findScopedMeeting(caller: MeetingCaller, meetingId: string) {
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) return null;
  // The bot was sent to this specific meeting by a scoped user, so the id it
  // holds IS its authorisation for that one row.
  if (caller.isBot) return meeting;

  // Unfiled: no repo means no repo scope to check, so the only rule left is
  // who recorded it. Deliberately narrow — an unfiled call is often a prospect
  // conversation the recorder has not decided anything about yet.
  if (!meeting.repoId) {
    return caller.userId && meeting.createdById === caller.userId ? meeting : null;
  }

  if (!caller.repos.some((r) => r.id === meeting.repoId)) return null;
  return meeting;
}
