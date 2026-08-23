import { prisma } from "@/lib/db";
import { getIssuesClosedSince, getOpenIssueCount } from "@/lib/github";
import { getInstallationAccessToken } from "@/lib/github-app";
import { magicButtonSuffix, magicLinkUrl, mintDigestLoginToken } from "@/lib/magic-login";

/**
 * The two daily WhatsApp nudges — a morning digest and an evening recap.
 *
 * One person is usually both the admin and a developer (issue #322), so the
 * digest is built ONCE per person and carries both halves: the org-wide
 * per-repo breakdown they own, and the count sitting on their own plate. Two
 * separate messages for the same human is the thing this file exists to avoid.
 */

/** IST is the only timezone this product's users live in. UTC+5:30. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Repos named in the breakdown string before it collapses into "+N more". */
const BREAKDOWN_LIMIT = 4;

/** Repos listed in the on-demand detail reply before it says "and N more". */
const DETAIL_LIMIT = 60;

/** How many GitHub requests may be in flight at once while counting. */
const CONCURRENCY = 6;

interface RepoCount {
  fullName: string;
  shortName: string;
  open: number;
}

interface Digest {
  userId: string;
  phone: string;
  name: string;
  /** Org-wide open issues across every org this user OWNS. */
  ownedOpen: number;
  /** Open issues assigned to this user's GitHub login, anywhere they can see. */
  assignedOpen: number;
  /** False when we never learned their GitHub login — `assignedOpen` is then meaningless. */
  githubLinked: boolean;
  /** Issues closed since the window start, across the repos they own. */
  closedInWindow: number;
  /** The number the message leads with — always the same source as `repoCounts`. */
  headlineOpen: number;
  /** Per-repo counts, biggest first, from whichever half actually has work. */
  repoCounts: RepoCount[];
  /** Human org label — "Navibyte" or "Navibyte and 1 more". */
  orgLabel: string;
  /**
   * The template's URL-button variable — `magic-link/<token>.<dest>` when a
   * token could be minted, otherwise the plain path. Never null while the person
   * owns an org: a template approved WITH a dynamic URL button is rejected
   * outright when its parameter is missing, losing the whole message rather than
   * just the button.
   */
  glitchgrabPath: string | null;
  /** Same destination as a full URL, for free-text replies. */
  dashboardUrl: string | null;
}

/**
 * Everything the digest crons need about one person, in one query.
 *
 * `repos` here is deliberately NOT `user.repos` — that relation is "repos this
 * user connected", which misses repos a co-owner connected to an org the user
 * owns. The digest is org-scoped, so repos come off the org.
 */
async function loadCandidates(phoneTail?: string) {
  return prisma.user.findMany({
    where: {
      // Matched on the last 10 digits, the same way every other phone lookup in
      // this codebase does: Meta always sends the country code, users rarely
      // type one when saving their number.
      whatsappPhone: phoneTail ? { endsWith: phoneTail } : { not: null },
      OR: [
        { ownedOrgs: { some: {} } },
        { orgMemberships: { some: {} } },
        { repos: { some: {} } },
      ],
    },
    select: {
      id: true,
      name: true,
      githubLogin: true,
      whatsappPhone: true,
      digestMutedUntil: true,
      ownedOrgs: {
        select: {
          name: true,
          githubOrgLogin: true,
          repos: {
            select: {
              fullName: true,
              owner: true,
              name: true,
              installation: { select: { installationId: true } },
            },
          },
        },
      },
      orgMemberships: {
        select: {
          org: {
            select: {
              repos: {
                select: {
                  fullName: true,
                  owner: true,
                  name: true,
                  installation: { select: { installationId: true } },
                },
              },
            },
          },
        },
      },
      repos: {
        select: {
          fullName: true,
          owner: true,
          name: true,
          installation: { select: { installationId: true } },
        },
      },
    },
  });
}

type CandidateRepo = {
  fullName: string;
  owner: string;
  name: string;
  installation: { installationId: number } | null;
};

/**
 * Run `task` over `items` a few at a time.
 *
 * A serial loop over 21 repos × 2 counts is 42 round trips one after another,
 * and a Vercel cron has a wall clock. A bare `Promise.all` over everything
 * trips GitHub's secondary rate limit instead, so: a small pool.
 */
async function mapPooled<T, R>(items: T[], task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  return results;
}

/**
 * Mint one installation token per installation, not one per repo.
 *
 * The cron this replaced called `getInstallationAccessToken` inside the repo
 * loop: 21 repos on one installation meant 21 token mints, serially, every
 * morning.
 */
async function tokenCache(): Promise<(installationId: number) => Promise<string | null>> {
  const cache = new Map<number, Promise<string | null>>();

  return (installationId: number) => {
    const hit = cache.get(installationId);
    if (hit) return hit;

    const pending = getInstallationAccessToken(installationId).catch((err) => {
      console.error("[digest] token mint failed for installation", installationId, err);
      return null;
    });
    cache.set(installationId, pending);
    return pending;
  };
}

/** Dedupe repos by full name — a repo can arrive via org, membership and user. */
function uniqueRepos(...groups: CandidateRepo[][]): CandidateRepo[] {
  const byName = new Map<string, CandidateRepo>();
  for (const group of groups) {
    for (const repo of group) {
      if (!byName.has(repo.fullName)) byName.set(repo.fullName, repo);
    }
  }
  return [...byName.values()];
}

/**
 * "PracticeStacks 32, Abhyasika 18, glitchgrab 12, +3 more"
 *
 * Meta rejects template parameters containing newlines, tabs or 4+ consecutive
 * spaces (error 132018), so the breakdown has to be one flat comma-separated
 * line — no bullet list, however much it wants to be one.
 */
export function formatBreakdown(counts: RepoCount[]): string {
  const active = counts.filter((c) => c.open > 0);
  if (!active.length) return "nothing open anywhere";

  const named = active.slice(0, BREAKDOWN_LIMIT).map((c) => `${c.shortName} ${c.open}`);
  const rest = active.length - named.length;
  if (rest > 0) named.push(`+${rest} more`);
  return named.join(", ");
}

/**
 * Which half of the digest the headline number and the breakdown come from.
 *
 * They must come from the SAME half or the message contradicts itself: an org
 * owner whose own org is clean but who has six issues assigned in a member org
 * would otherwise be told "there are 6 open issues waiting. Where they sit:
 * nothing open anywhere." Gated on whether a half has anything open, NOT on
 * whether the person owns repos — owning a quiet org is not the same as having
 * nothing to do.
 */
export function pickBreakdown(
  ownedCounts: RepoCount[],
  assignedCounts: RepoCount[]
): { headlineOpen: number; repoCounts: RepoCount[] } {
  const ownedOpen = ownedCounts.reduce((sum, c) => sum + c.open, 0);
  if (ownedOpen > 0) {
    return { headlineOpen: ownedOpen, repoCounts: [...ownedCounts].sort((a, b) => b.open - a.open) };
  }

  const assignedOpen = assignedCounts.reduce((sum, c) => sum + c.open, 0);
  return {
    headlineOpen: assignedOpen,
    repoCounts: [...assignedCounts].sort((a, b) => b.open - a.open),
  };
}

/**
 * The value after the template's "Assigned to you:" label.
 *
 * A bare count, because the label already carries the meaning — the template
 * renders it in bold on its own line, and "Assigned to you: 6 assigned to you"
 * is what the earlier sentence-shaped version produced.
 *
 * Says "GitHub not linked" rather than "0" when we have no login for them: a
 * confident zero that is really a missing join is how someone stops trusting
 * every other number in the message.
 */
export function formatOwnPlate(assignedOpen: number, githubLinked: boolean): string {
  if (!githubLinked) return "GitHub not linked";
  if (assignedOpen === 0) return "none";
  return String(assignedOpen);
}

/** "Navibyte" / "Navibyte and 1 more" / "your repos" when they own no org. */
function formatOrgLabel(orgNames: string[]): string {
  if (!orgNames.length) return "your repos";
  if (orgNames.length === 1) return orgNames[0];
  return `${orgNames[0]} and ${orgNames.length - 1} more`;
}

/**
 * Is this person muted right now?
 *
 * Exported so both crons apply the identical rule — a mute that the morning
 * cron honours and the evening one ignores is worse than no mute at all.
 */
export function isMuted(mutedUntil: Date | null | undefined, now = new Date()): boolean {
  return !!mutedUntil && mutedUntil.getTime() > now.getTime();
}

/**
 * When a "LEAVE" reply should wear off.
 *
 * Rest of the day, IST — the user's choice on issue #322. One wrinkle: a reply
 * that lands AFTER the evening recap has already gone out would otherwise mute
 * nothing at all (the day is over), so an evening reply carries into the whole
 * of the next day. In both cases the promise is the same one the message makes:
 * you will not hear from us again until the day after you said stop.
 */
export function muteUntil(now = new Date()): Date {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const istHour = ist.getUTCHours();

  // Midnight IST at the start of the NEXT day, expressed back in UTC.
  const daysAhead = istHour >= 18 ? 2 : 1;
  const nextMidnightIst = Date.UTC(
    ist.getUTCFullYear(),
    ist.getUTCMonth(),
    ist.getUTCDate() + daysAhead
  );

  return new Date(nextMidnightIst - IST_OFFSET_MS);
}

/** Start of today in IST, as a UTC instant — the evening recap's window. */
export function startOfIstDay(now = new Date()): Date {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const midnightIst = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  return new Date(midnightIst - IST_OFFSET_MS);
}

/**
 * Build one person's digest on demand, for a "Show details" tap.
 *
 * Ignores the mute deliberately: they just asked. A mute silences what we send
 * unprompted, not an answer to a question.
 *
 * Returns null when the number belongs to nobody we know, or to someone with no
 * repos at all — the caller then leaves the message to the other handlers rather
 * than replying with an empty list.
 */
export async function buildDigestForPhone(phone: string): Promise<Digest | null> {
  const tail = phone.replace(/\D/g, "").slice(-10);
  if (tail.length !== 10) return null;

  const [user] = await loadCandidates(tail);
  if (!user) return null;

  return buildOne(user, await tokenCache());
}

/**
 * The full repo-by-repo list, as free text.
 *
 * Only legal because the person tapped a button, which counts as an inbound
 * message and opens Meta's 24-hour service window — inside it we can send this
 * without a template, and Meta does not bill it. That window is the whole reason
 * the detail lives here rather than in a second template nobody would read.
 *
 * Untruncated on purpose: the digest itself collapses to "+3 more" to stay
 * inside a template parameter, and this is where the rest of it lives.
 */
export function formatDetailMessage(digest: Digest): string {
  const active = digest.repoCounts.filter((c) => c.open > 0);
  const lines: string[] = [`*Open issues — ${digest.orgLabel}*`, ""];

  if (!active.length) {
    lines.push("Nothing open anywhere right now.");
  } else {
    // Hard cap far above any real org, so a runaway account cannot push the
    // message past WhatsApp's 4096-character limit and get it dropped whole.
    const shown = active.slice(0, DETAIL_LIMIT);
    for (const repo of shown) {
      lines.push(`${repo.shortName} — *${repo.open}*`);
    }
    if (active.length > shown.length) {
      lines.push(`…and ${active.length - shown.length} more repos not listed.`);
    }
    lines.push("", `Total: *${digest.headlineOpen}*`);
  }

  if (digest.githubLinked) {
    lines.push(`Assigned to you: *${digest.assignedOpen}*`);
  } else {
    lines.push("Assigned to you: GitHub not linked");
  }

  if (digest.dashboardUrl) {
    // Carries the same single-use login token as the button, so the link opens
    // the dashboard signed in rather than at a login screen.
    lines.push("", `Full view: ${digest.dashboardUrl}`);
  }

  return lines.join("\n");
}

/**
 * Mute a person by the WhatsApp number that messaged us.
 *
 * Matched on the last 10 digits, the same way the tester login lookup does:
 * Meta always sends the country code, users rarely type one when saving their
 * number, and an exact comparison silently matches nobody.
 *
 * Returns the muted user's first name so the reply can use it, or null when the
 * number belongs to nobody we know.
 */
export async function muteDigestByPhone(phone: string): Promise<{ name: string; until: Date } | null> {
  const tail = phone.replace(/\D/g, "").slice(-10);
  if (tail.length !== 10) return null;

  const user = await prisma.user.findFirst({
    where: { whatsappPhone: { endsWith: tail } },
    select: { id: true, name: true },
  });
  if (!user) return null;

  const until = muteUntil();
  await prisma.user.update({ where: { id: user.id }, data: { digestMutedUntil: until } });

  return { name: user.name?.split(" ")[0] ?? "there", until };
}

/** Undo a mute early — someone who typed LEAVE and then came back. */
export async function unmuteDigestByPhone(phone: string): Promise<string | null> {
  const tail = phone.replace(/\D/g, "").slice(-10);
  if (tail.length !== 10) return null;

  const user = await prisma.user.findFirst({
    where: { whatsappPhone: { endsWith: tail }, digestMutedUntil: { not: null } },
    select: { id: true, name: true },
  });
  if (!user) return null;

  await prisma.user.update({ where: { id: user.id }, data: { digestMutedUntil: null } });
  return user.name?.split(" ")[0] ?? "there";
}

/**
 * Build a digest for every person who should hear from us right now.
 *
 * `closedSince` set → the evening recap's "what got finished today" number is
 * counted too; leave it undefined for the morning digest and skip that work.
 * Muted people are dropped here rather than in the crons so the mute can never
 * be honoured in one place and forgotten in the other.
 */
export async function buildDigests({ closedSince }: { closedSince?: Date } = {}): Promise<Digest[]> {
  const candidates = await loadCandidates();
  const tokenFor = await tokenCache();
  const now = new Date();
  const digests: Digest[] = [];

  for (const user of candidates) {
    if (isMuted(user.digestMutedUntil, now)) continue;

    const digest = await buildOne(user, tokenFor, closedSince);
    if (digest) digests.push(digest);
  }

  return digests;
}

type Candidate = Awaited<ReturnType<typeof loadCandidates>>[number];

/** One person's counts. Split out so an on-demand reply can build just theirs. */
async function buildOne(
  user: Candidate,
  tokenFor: (installationId: number) => Promise<string | null>,
  closedSince?: Date
): Promise<Digest | null> {
  {
    if (!user.whatsappPhone) return null;

    const ownedRepos = uniqueRepos(user.ownedOrgs.flatMap((org) => org.repos));
    const visibleRepos = uniqueRepos(
      ownedRepos,
      user.orgMemberships.flatMap((m) => m.org.repos),
      user.repos
    );

    // Admin half — every repo in the orgs they own, counted per repo so the
    // message can say WHERE the backlog is, not just that it exists.
    const ownedCounts = await mapPooled(ownedRepos, async (repo): Promise<RepoCount> => {
      const installationId = repo.installation?.installationId;
      if (!installationId) return { fullName: repo.fullName, shortName: repo.name, open: 0 };

      const token = await tokenFor(installationId);
      if (!token) return { fullName: repo.fullName, shortName: repo.name, open: 0 };

      const open = await getOpenIssueCount(token, repo.owner, repo.name);
      return { fullName: repo.fullName, shortName: repo.name, open };
    });

    // Developer half — what is actually assigned to them, across everything
    // they can see. Skipped entirely when we do not know their GitHub login.
    let assignedCounts: RepoCount[] = [];
    if (user.githubLogin) {
      const login = user.githubLogin;
      assignedCounts = await mapPooled(visibleRepos, async (repo): Promise<RepoCount> => {
        const installationId = repo.installation?.installationId;
        const token = installationId ? await tokenFor(installationId) : null;
        const open = token ? await getOpenIssueCount(token, repo.owner, repo.name, login) : 0;
        return { fullName: repo.fullName, shortName: repo.name, open };
      });
    }
    const assignedOpen = assignedCounts.reduce((sum, c) => sum + c.open, 0);

    let closedInWindow = 0;
    if (closedSince) {
      const closed = await mapPooled(ownedRepos.length ? ownedRepos : visibleRepos, async (repo) => {
        const installationId = repo.installation?.installationId;
        if (!installationId) return 0;

        const token = await tokenFor(installationId);
        if (!token) return 0;

        return getIssuesClosedSince(token, repo.owner, repo.name, closedSince);
      });
      closedInWindow = closed.reduce((sum, n) => sum + n, 0);
    }

    const ownedOpen = ownedCounts.reduce((sum, c) => sum + c.open, 0);
    const { headlineOpen, repoCounts } = pickBreakdown(ownedCounts, assignedCounts);

    const orgLogin = user.ownedOrgs[0]?.githubOrgLogin ?? null;
    const targetPath = orgLogin ? `/org/${orgLogin}` : "/dashboard";

    // Auto-login so the button is one tap, not a tap plus a GitHub round trip.
    // Returns null on rate limit or any failure, and both helpers then fall back
    // to a plain link — a digest must never be lost because a token could not
    // be minted.
    const loginToken = await mintDigestLoginToken({ userId: user.id, targetPath });

    return {
      userId: user.id,
      phone: user.whatsappPhone,
      name: user.name?.split(" ")[0] ?? "there",
      ownedOpen,
      assignedOpen,
      githubLinked: !!user.githubLogin,
      headlineOpen,
      closedInWindow,
      repoCounts,
      orgLabel: formatOrgLabel(user.ownedOrgs.map((org) => org.name)),
      glitchgrabPath: magicButtonSuffix(loginToken, targetPath),
      dashboardUrl: magicLinkUrl(loginToken, targetPath),
    };
  }
}
