// ─── Types ──────────────────────────────────────────────

interface CreateIssueInput {
  owner: string;
  repo: string;
  title: string;
  body: string;
  labels: string[];
}

interface CreatedIssue {
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

// ─── Fetch Workflow Runs ─────────────────────────────

export type WorkflowRunStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "waiting"
  | "requested"
  | "pending"
  | "unknown";

type WorkflowRunConclusion =
  | "success"
  | "failure"
  | "cancelled"
  | "skipped"
  | "timed_out"
  | "action_required"
  | "neutral"
  | "stale"
  | "startup_failure"
  | null;

export interface WorkflowRun {
  id: number;
  name: string;
  status: WorkflowRunStatus;
  conclusion: WorkflowRunConclusion;
  branch: string;
  event: string;
  htmlUrl: string;
  runStartedAt: string;
  updatedAt: string;
  durationMs: number | null;
  commitMessage: string;
  commitSha: string;
  actorLogin: string | null;
  actorAvatar: string | null;
}

interface GithubWorkflowRun {
  id: number;
  name: string | null;
  head_branch: string | null;
  head_sha: string;
  event: string;
  status: string | null;
  conclusion: string | null;
  html_url: string;
  run_started_at: string | null;
  created_at: string;
  updated_at: string;
  head_commit: { message: string } | null;
  actor: { login: string; avatar_url: string } | null;
}

export async function listWorkflowRuns(
  accessToken: string,
  owner: string,
  repo: string,
  perPage = 5
): Promise<WorkflowRun[]> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/actions/runs?per_page=${perPage}`;
  const response = await fetch(url, { method: "GET", headers: headers(accessToken) });
  if (!response.ok) {
    throw new Error(`GitHub workflow runs error (${response.status})`);
  }

  const data = (await response.json()) as { workflow_runs?: GithubWorkflowRun[] };
  const runs = data.workflow_runs ?? [];

  return runs.map((r) => {
    const startedAt = r.run_started_at ?? r.created_at;
    const updatedAt = r.updated_at;
    const durationMs =
      r.status === "completed" && startedAt
        ? Math.max(0, new Date(updatedAt).getTime() - new Date(startedAt).getTime())
        : null;

    return {
      id: r.id,
      name: r.name ?? "Workflow",
      status: (r.status ?? "unknown") as WorkflowRunStatus,
      conclusion: (r.conclusion ?? null) as WorkflowRunConclusion,
      branch: r.head_branch ?? "—",
      event: r.event,
      htmlUrl: r.html_url,
      runStartedAt: startedAt,
      updatedAt,
      durationMs,
      commitMessage: (r.head_commit?.message ?? "").split("\n")[0] ?? "",
      commitSha: r.head_sha.slice(0, 7),
      actorLogin: r.actor?.login ?? null,
      actorAvatar: r.actor?.avatar_url ?? null,
    };
  });
}

// ─── Reopen Issue ────────────────────────────────────

export async function reopenGitHubIssue(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<void> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}`, {
    method: "PATCH",
    headers: headers(accessToken),
    body: JSON.stringify({ state: "open" }),
  });
  if (!res.ok) {
    throw new Error(`GitHub reopen error (${res.status}): ${await res.text()}`);
  }
}

// ─── Check If Issue Is Still Open ────────────────────

export async function checkIssueIsOpen(
  accessToken: string,
  issueUrl: string
): Promise<boolean> {
  const match = issueUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (!match) return false;
  const [, owner, repo, number] = match;
  try {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues/${number}`, {
      headers: headers(accessToken),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { state: string };
    return data.state === "open";
  } catch {
    return false;
  }
}

export async function getOpenIssueCount(
  accessToken: string,
  owner: string,
  repo: string
): Promise<number> {
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/issues?state=open&per_page=1`,
      { headers: headers(accessToken) }
    );
    if (!res.ok) return 0;
    const linkHeader = res.headers.get("link") ?? "";
    const lastMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
    if (lastMatch) return parseInt(lastMatch[1], 10);
    const data = (await res.json()) as unknown[];
    return data.length;
  } catch {
    return 0;
  }
}

export async function getClosedIssueCountSince(
  accessToken: string,
  owner: string,
  repo: string,
  since: Date
): Promise<number> {
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/issues?state=closed&since=${since.toISOString()}&per_page=1`,
      { headers: headers(accessToken) }
    );
    if (!res.ok) return 0;
    const linkHeader = res.headers.get("link") ?? "";
    const lastMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
    if (lastMatch) return parseInt(lastMatch[1], 10);
    const data = (await res.json()) as unknown[];
    return data.length;
  } catch {
    return 0;
  }
}

// ─── Org Types ──────────────────────────────────────────

interface GitHubOrg {
  id: number;
  login: string;
  description: string | null;
  avatarUrl: string | null;
}

interface GitHubOrgRepo {
  id: number;
  fullName: string;
  owner: string;
  name: string;
  isPrivate: boolean;
}

// ─── Org Helpers ────────────────────────────────────────

export async function getGitHubUserLogin(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${GITHUB_API}/user`, { headers: headers(accessToken) });
    if (!res.ok) return null;
    const data = (await res.json()) as { login: string };
    return data.login;
  } catch {
    return null;
  }
}

export async function getUserOrgs(accessToken: string): Promise<GitHubOrg[]> {
  try {
    const res = await fetch(`${GITHUB_API}/user/orgs?per_page=100`, { headers: headers(accessToken) });
    if (!res.ok) return [];
    const data = (await res.json()) as { id: number; login: string; description: string | null; avatar_url: string }[];
    return data.map((o) => ({ id: o.id, login: o.login, description: o.description, avatarUrl: o.avatar_url }));
  } catch {
    return [];
  }
}

// Returns a map of orgLogin → "OWNER" | "MEMBER" based on GitHub membership role
export async function getUserOrgRoles(accessToken: string): Promise<Map<string, "OWNER" | "MEMBER">> {
  try {
    const res = await fetch(`${GITHUB_API}/user/memberships/orgs?per_page=100`, { headers: headers(accessToken) });
    if (!res.ok) return new Map();
    const data = (await res.json()) as { state: string; role: string; organization: { login: string } }[];
    const map = new Map<string, "OWNER" | "MEMBER">();
    for (const m of data) {
      if (m.state === "active") {
        map.set(m.organization.login, m.role === "admin" ? "OWNER" : "MEMBER");
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

export async function getOrgRepos(accessToken: string, orgLogin: string): Promise<GitHubOrgRepo[]> {
  const results: GitHubOrgRepo[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `${GITHUB_API}/orgs/${orgLogin}/repos?per_page=100&page=${page}&type=all`,
      { headers: headers(accessToken) }
    );
    if (!res.ok) break;
    const data = (await res.json()) as { id: number; full_name: string; owner: { login: string }; name: string; private: boolean }[];
    if (data.length === 0) break;
    for (const r of data) {
      results.push({ id: r.id, fullName: r.full_name, owner: r.owner.login, name: r.name, isPrivate: r.private });
    }
    if (data.length < 100) break;
    page++;
  }
  return results;
}

export async function getGitHubOrgInfo(accessToken: string, orgLogin: string): Promise<{ id: number; login: string; name: string } | null> {
  try {
    const res = await fetch(`${GITHUB_API}/orgs/${orgLogin}`, { headers: headers(accessToken) });
    if (!res.ok) return null;
    const data = (await res.json()) as { id: number; login: string; name: string | null };
    return { id: data.id, login: data.login, name: data.name ?? data.login };
  } catch {
    return null;
  }
}

interface GitHubOrgMember {
  login: string;
  avatarUrl: string;
}

export async function getGitHubOrgMembers(accessToken: string, orgLogin: string): Promise<GitHubOrgMember[]> {
  try {
    const res = await fetch(`${GITHUB_API}/orgs/${orgLogin}/members?per_page=100`, {
      headers: headers(accessToken),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { login: string; avatar_url: string }[];
    return data.map((m) => ({ login: m.login, avatarUrl: m.avatar_url }));
  } catch {
    return [];
  }
}

