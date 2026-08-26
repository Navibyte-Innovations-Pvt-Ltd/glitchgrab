/**
 * The thin HTTP layer between the MCP tools and the Glitchgrab API.
 *
 * Every call is the same shape as an SDK call: `Authorization: Bearer gg_…`,
 * one token, one repo. There is no repo parameter anywhere in this server on
 * purpose — an agent cannot aim a report at a project its token does not own,
 * because it never names the project at all.
 */

export const DEFAULT_BASE_URL = "https://glitchgrab.dev";

export class GlitchgrabError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "GlitchgrabError";
  }
}

export interface OpenIssue {
  number: number;
  title: string;
  url: string;
  updatedAt: string;
}

export interface ProjectContext {
  project: string;
  hasBrief: boolean;
  brief: Record<string, string> | null;
  notes: string[];
}

export interface ReportResult {
  reportId: string;
  status: string;
  issueUrl?: string | null;
  issueNumber?: number | null;
  message?: string;
}

interface Envelope<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

export class GlitchgrabClient {
  constructor(
    private readonly token: string,
    private readonly baseUrl: string = DEFAULT_BASE_URL
  ) {}

  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
        ...(init?.headers ?? {}),
      },
    });

    const envelope = (await res.json().catch(() => null)) as Envelope<T> | null;
    if (!res.ok || !envelope?.success) {
      // Surfaced to the agent verbatim: "Invalid API token" is something the
      // person running it can act on, "request failed" is not.
      throw new GlitchgrabError(envelope?.error ?? `Request failed (${res.status})`, res.status);
    }
    return envelope.data as T;
  }

  /** Open issues on the token's repo, ranked by `query` when one is given. */
  listOpenIssues(query?: string, limit = 30) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("limit", String(limit));
    return this.call<{ issues: OpenIssue[]; total: number }>(`/api/v1/sdk/issues?${params}`);
  }

  /** GLITCH.md plus the dashboard notes — the same brief the assistant reads. */
  getProjectContext() {
    return this.call<ProjectContext>("/api/v1/sdk/context");
  }

  /** Reports already filed, so an agent can read the evidence behind a bug. */
  listReports(params: { status?: string; limit?: number } = {}) {
    const search = new URLSearchParams();
    if (params.status) search.set("status", params.status);
    search.set("limit", String(params.limit ?? 10));
    return this.call<{ reports: unknown[] }>(`/api/v1/sdk/reports?${search}`);
  }

  /**
   * File a report. Same endpoint, same deterministic pipeline and dedup as a
   * report typed by a person — an agent gets no privileged path to GitHub.
   */
  createReport(params: {
    description: string;
    type?: string;
    reporterName: string;
    reporterPrimaryKey: string;
    /** Set to add the report to an issue that already exists instead of
     *  opening another. The server re-validates the number against the repo. */
    duplicateIssueNumber?: number;
  }) {
    return this.call<ReportResult>("/api/v1/sdk/report", {
      method: "POST",
      body: JSON.stringify({
        source: "MCP",
        description: params.description,
        type: params.type ?? "BUG",
        metadata: {
          // The route reads the reporter off metadata, same as the SDK does.
          sessionUserName: params.reporterName,
          sessionUserId: params.reporterPrimaryKey,
          ...(params.duplicateIssueNumber
            ? { duplicateIssueNumber: String(params.duplicateIssueNumber) }
            : {}),
        },
      }),
    });
  }
}
