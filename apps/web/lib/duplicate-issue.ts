import { commentOnGitHubIssue, getGitHubIssue } from "@/lib/github";
import { getInstallationAccessToken } from "@/lib/github-app";
import { prisma } from "@/lib/db";

/**
 * Adding a report to the issue it duplicates, instead of opening another one
 * (#330 follow-up).
 *
 * The assistant is what spots the match — it reads the repo's open issue titles
 * during the conversation and tags the number. Everything after that is this
 * file, and it is deliberately dumb: the comment body is built from the text
 * the reporter already approved in the textarea, exactly the way `buildIssueBody`
 * builds an issue. No model runs here.
 *
 * ── Why the checks below are not optional ───────────────────────────────────
 * The issue number arrives in report metadata, which is client-controlled. A
 * number that is not an open issue *on this repo* would otherwise let anyone
 * with a token write a comment onto any issue the installation can reach. So:
 * the repo comes from the caller's own credential, the number is fetched back
 * from GitHub under that repo's installation, and a closed issue is refused —
 * attaching to a closed thread hides the report from everyone.
 */

interface AttachResult {
  number: number;
  url: string;
}

/** Parses the number a host put in metadata. Anything odd → null → file normally. */
export function readDuplicateNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  if (!Number.isInteger(n) || n <= 0 || n > 9_999_999) return null;
  return n;
}

/**
 * Post the report onto an existing open issue.
 *
 * Returns null when the issue is missing, closed, or not on this repo — every
 * caller treats null as "file it as a new issue", so a wrong guess costs a
 * duplicate issue rather than a lost report.
 */
export async function attachToExistingIssue(params: {
  repoId: string;
  issueNumber: number;
  /** The finished report body — same text that would have become the issue. */
  body: string;
}): Promise<AttachResult | null> {
  try {
    const repo = await prisma.repo.findUnique({
      where: { id: params.repoId },
      select: { owner: true, name: true, installation: true },
    });
    if (!repo?.installation) return null;

    const token = await getInstallationAccessToken(repo.installation.installationId);
    const existing = await getGitHubIssue(token, repo.owner, repo.name, params.issueNumber);
    if (!existing || existing.state !== "open") return null;

    await commentOnGitHubIssue(token, repo.owner, repo.name, params.issueNumber, params.body);

    return {
      number: params.issueNumber,
      url: existing.html_url,
    };
  } catch {
    // GitHub down, token expired, issue deleted — the caller falls back to
    // creating the issue. A report is never lost to this path.
    return null;
  }
}

/** The banner a comment gets, so a maintainer can see it came in as a duplicate. */
export function buildDuplicateComment(body: string): string {
  return `> Another report of this came in via Glitchgrab.\n\n${body}`;
}
