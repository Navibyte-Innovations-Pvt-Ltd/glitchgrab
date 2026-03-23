// ─── Types ──────────────────────────────────────────────

export interface CreateIssueInput {
  owner: string;
  repo: string;
  title: string;
  body: string;
  labels: string[];
}

export interface CreatedIssue {
  number: number;
  url: string;
  title: string;
}

interface GitHubLabel {
  name: string;
  color: string;
  description: string | null;
}

// ─── Constants ──────────────────────────────────────────

const GITHUB_API = "https://api.github.com";
const USER_AGENT = "Glitchgrab/1.0";

// ─── Helpers ────────────────────────────────────────────

function headers(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": USER_AGENT,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

// ─── Create Issue ───────────────────────────────────────

export async function createGitHubIssue(
  accessToken: string,
  input: CreateIssueInput
): Promise<CreatedIssue> {
  const url = `${GITHUB_API}/repos/${input.owner}/${input.repo}/issues`;

  const response = await fetch(url, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({
      title: input.title,
      body: input.body,
      labels: input.labels,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `GitHub API error (${response.status}): ${errorBody}`
    );
  }

  const data = (await response.json()) as {
    number: number;
    html_url: string;
    title: string;
  };

  return {
    number: data.number,
    url: data.html_url,
    title: data.title,
  };
}

// ─── Update Issue Body ─────────────────────────────────

export async function updateIssueBody(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number,
  appendContent: string
): Promise<void> {
  // First fetch the current body
  const getUrl = `${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}`;
  const getRes = await fetch(getUrl, { method: "GET", headers: headers(accessToken) });
  if (!getRes.ok) throw new Error(`Failed to fetch issue #${issueNumber}: ${getRes.status}`);

  const issue = (await getRes.json()) as { body: string | null };
  const currentBody = issue.body ?? "";

  // Append the new content
  const updatedBody = `${currentBody}\n\n---\n\n## Update\n\n${appendContent}`;

  const patchRes = await fetch(getUrl, {
    method: "PATCH",
    headers: headers(accessToken),
    body: JSON.stringify({ body: updatedBody }),
  });
  if (!patchRes.ok) throw new Error(`Failed to update issue #${issueNumber}: ${patchRes.status}`);
}

// ─── Comment on Issue ──────────────────────────────────

export async function commentOnIssue(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<void> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
  const response = await fetch(url, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({ body }),
  });
  if (!response.ok) {
    throw new Error(`Failed to comment on issue #${issueNumber}: ${response.status}`);
  }
}

// ─── Close Issue ───────────────────────────────────────

export async function closeIssue(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number,
  comment?: string
): Promise<void> {
  if (comment) {
    await commentOnIssue(accessToken, owner, repo, issueNumber, comment);
  }
  const url = `${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: headers(accessToken),
    body: JSON.stringify({ state: "closed" }),
  });
  if (!response.ok) {
    throw new Error(`Failed to close issue #${issueNumber}: ${response.status}`);
  }
}

// ─── Fetch Open Issues ─────────────────────────────────

export async function fetchOpenIssues(
  accessToken: string,
  owner: string,
  repo: string
): Promise<{ number: number; title: string }[]> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/issues?state=open&per_page=50&sort=updated`;
  const response = await fetch(url, {
    method: "GET",
    headers: headers(accessToken),
  });
  if (!response.ok) return [];
  const data = (await response.json()) as { number: number; title: string; pull_request?: unknown }[];
  // Filter out PRs (GitHub API returns PRs in issues endpoint)
  return data
    .filter((i) => !i.pull_request)
    .map((i) => ({ number: i.number, title: i.title }));
}

// ─── Upload Screenshot ─────────────────────────────────

export async function uploadScreenshotToRepo(
  accessToken: string,
  owner: string,
  repo: string,
  base64DataUrl: string,
  reportId: string
): Promise<string | null> {
  try {
    // Extract base64 content from data URL
    const base64Match = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) return null;

    const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
    const base64Content = base64Match[2];
    const path = `.glitchgrab/screenshots/${reportId}.${ext}`;

    const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: headers(accessToken),
      body: JSON.stringify({
        message: `[Glitchgrab] Add screenshot for report ${reportId}`,
        content: base64Content,
      }),
    });

    if (!response.ok) {
      console.error(`Failed to upload screenshot (${response.status})`);
      return null;
    }

    const data = (await response.json()) as {
      content: { download_url: string };
    };

    return data.content.download_url;
  } catch (error) {
    console.error("Screenshot upload failed:", error);
    return null;
  }
}

// ─── Fetch Repo Labels ─────────────────────────────────

export async function fetchRepoLabels(
  accessToken: string,
  owner: string,
  repo: string
): Promise<string[]> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/labels?per_page=100`;

  const response = await fetch(url, {
    method: "GET",
    headers: headers(accessToken),
  });

  if (!response.ok) {
    // Non-fatal — return empty if we can't fetch labels
    console.error(
      `Failed to fetch labels (${response.status}):`,
      await response.text()
    );
    return [];
  }

  const data = (await response.json()) as GitHubLabel[];
  return data.map((label) => label.name);
}
