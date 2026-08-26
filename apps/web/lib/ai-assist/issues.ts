import { getInstallationAccessToken } from "@/lib/github-app";
import { prisma } from "@/lib/db";

/**
 * The repo's open issues, as titles, for the report assistant (#330 follow-up).
 *
 * Why the assistant needs them: a reporter has no idea whether the thing
 * annoying them is already filed. Without this the product's answer to "the
 * save button is broken" is a fifth issue saying the save button is broken,
 * and the team triages the same bug five times.
 *
 * Why only titles: the whole list has to ride inside one model turn a person is
 * waiting on. 60 titles is roughly a thousand tokens; 60 bodies is a hundred
 * thousand and a timeout. A title is also all the model needs to say "this
 * looks like #123" — the decision to actually attach is checked against the
 * server's own copy of the list afterwards, never taken on the model's word.
 *
 * Live from GitHub rather than from our `Issue` rows, because most repos have
 * issues nobody filed through Glitchgrab, and a duplicate check that cannot see
 * them is a duplicate check that misses the common case.
 */

export interface OpenIssue {
  number: number;
  title: string;
  url: string;
  /** ISO string. The assistant says "open since…", so staleness is visible. */
  updatedAt: string;
}

/** Pulled from GitHub; `rankIssues` decides which ~30 of these reach the model. */
const MAX_ISSUES = 100;
/** Long enough to spare the API on a chatty conversation, short enough that an
 *  issue closed a minute ago stops being offered almost immediately. */
const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map<string, { issues: OpenIssue[]; expiresAt: number }>();

interface GitHubIssueListItem {
  number: number;
  title: string;
  html_url: string;
  updated_at: string;
  pull_request?: unknown;
}

/**
 * Fetch the open issues for a repo. Never throws — the assistant works without
 * this list, it just cannot spot duplicates, and a GitHub outage must not take
 * the report dialog down with it.
 */
export async function getOpenIssues(repoId: string): Promise<OpenIssue[]> {
  const cached = cache.get(repoId);
  if (cached && cached.expiresAt > Date.now()) return cached.issues;

  try {
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      select: { owner: true, name: true, installation: true },
    });
    if (!repo?.installation) return [];

    const token = await getInstallationAccessToken(repo.installation.installationId);
    const res = await fetch(
      `https://api.github.com/repos/${repo.owner}/${repo.name}/issues` +
        `?state=open&sort=updated&direction=desc&per_page=${MAX_ISSUES}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    if (!res.ok) return [];

    const raw = (await res.json()) as GitHubIssueListItem[];
    const issues = raw
      // `/issues` returns pull requests too. A PR is not a duplicate of a bug
      // report, and attaching a reporter's screenshot to someone's PR thread is
      // the wrong side of the workflow entirely.
      .filter((i) => !i.pull_request)
      .map((i) => ({
        number: i.number,
        title: i.title,
        url: i.html_url,
        updatedAt: i.updated_at,
      }));

    cache.set(repoId, { issues, expiresAt: Date.now() + CACHE_TTL_MS });
    return issues;
  } catch {
    return [];
  }
}

/** Words too common to say anything about which issue this is. */
const STOP_WORDS = new Set([
  "the","a","an","is","it","and","or","to","of","in","on","for","with","this","that",
  "not","but","are","was","were","be","been","i","we","you","my","our","when","then",
  "there","here","its","it's","do","does","did","can","cannot","should","would","page",
  "issue","bug","problem","error","app","also","from","have","has","get","got","if",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Put the issues most likely to BE this report at the front.
 *
 * Plain word overlap, deliberately — the alternative is embedding sixty titles
 * on every turn of a conversation somebody is waiting through, for a list the
 * model is about to read anyway. This only decides which thirty it reads; the
 * model still does the judging.
 *
 * With nothing typed yet (the reporter tapped a starter chip), overlap is zero
 * for everything and the order falls back to most-recently-updated, which is
 * the right default: those are the issues the team is actually working on.
 */
export function rankIssues(issues: OpenIssue[], text: string, limit = 30): OpenIssue[] {
  const words = new Set(tokenize(text));
  if (!words.size) return issues.slice(0, limit);

  return issues
    .map((issue) => {
      const titleWords = tokenize(issue.title);
      const hits = titleWords.filter((w) => words.has(w)).length;
      // Divided by length so a long title cannot win on sheer surface area.
      return { issue, score: hits === 0 ? 0 : hits / Math.sqrt(titleWords.length || 1) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.issue);
}

/**
 * Is this number one of the repo's actually-open issues?
 *
 * The model's duplicate pick is a suggestion about untrusted text; this is what
 * turns it into an action. A number it invented, or one belonging to a
 * different repo, resolves to null and the report is filed normally.
 */
export function resolveIssue(issues: OpenIssue[], number: number | null): OpenIssue | null {
  if (!number) return null;
  return issues.find((i) => i.number === number) ?? null;
}
