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

// ─── Fetch Recent Issues (open + recently closed) ─────

export async function fetchRecentIssues(
  accessToken: string,
  owner: string,
  repo: string
): Promise<{ number: number; title: string; state: string; body: string }[]> {
  // Fetch both open and recent issues for better dedup context
  const url = `${GITHUB_API}/repos/${owner}/${repo}/issues?state=all&per_page=20&sort=updated`;
  const response = await fetch(url, {
    method: "GET",
    headers: headers(accessToken),
  });
  if (!response.ok) return [];
  const data = (await response.json()) as { number: number; title: string; state: string; body: string | null; pull_request?: unknown }[];
  return data
    .filter((i) => !i.pull_request)
    .map((i) => ({
      number: i.number,
      title: i.title,
      state: i.state,
      // Truncate body to ~500 chars to keep token usage reasonable
      body: (i.body ?? "").slice(0, 500),
    }));
}

// ─── Fetch Issue Body ──────────────────────────────────

export async function fetchIssueBody(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<string> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}`;
  const response = await fetch(url, { method: "GET", headers: headers(accessToken) });
  if (!response.ok) return "";
  const data = (await response.json()) as { body: string | null };
  return data.body ?? "";
}

// ─── Fetch Repo README ────────────────────────────────

export async function fetchRepoReadme(
  accessToken: string,
  owner: string,
  repo: string
): Promise<string | null> {
  try {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/readme`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...headers(accessToken),
        Accept: "application/vnd.github.raw+json",
      },
    });
    if (!response.ok) return null;
    const text = await response.text();
    // Truncate to ~2000 chars to keep token usage reasonable
    return text.slice(0, 2000);
  } catch {
    return null;
  }
}

// ─── Fetch Repo Description ──────────────────────────

export async function fetchRepoDescription(
  accessToken: string,
  owner: string,
  repo: string
): Promise<string | null> {
  try {
    const url = `${GITHUB_API}/repos/${owner}/${repo}`;
    const response = await fetch(url, {
      method: "GET",
      headers: headers(accessToken),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { description: string | null; topics: string[] };
    const parts: string[] = [];
    if (data.description) parts.push(data.description);
    if (data.topics?.length > 0) parts.push(`Topics: ${data.topics.join(", ")}`);
    return parts.length > 0 ? parts.join("\n") : null;
  } catch {
    return null;
  }
}

