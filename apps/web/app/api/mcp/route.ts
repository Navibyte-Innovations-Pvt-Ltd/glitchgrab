export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getValidAccessToken } from "@/lib/gsc-tokens";
import { getSitemapUrls, inspectUrl, requestIndexing } from "@/lib/gsc";
import { hashToken } from "@/lib/tokens";
import { createScreenshotUploadUrl } from "@/lib/s3";
import { commentOnGitHubIssue, getGitHubIssueDetail } from "@/lib/github";
import { getInstallationAccessToken } from "@/lib/github-app";
import { publicOrigin, verifyAccessToken, visibleRepoWhere } from "@/lib/mcp-oauth";

// ─── JSON-RPC helpers ────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
  id: string | number | null;
}

/**
 * A protocol result, returned as-is.
 *
 * `initialize` and `tools/list` have their own result shapes — the client reads
 * `result.protocolVersion` and `result.tools` directly. Wrapping those in a
 * `content` block (which is the shape for a *tool call* result, see
 * `rpcToolResult`) makes the handshake unparseable, and the client reports the
 * server errored while connecting. Every response used to be wrapped this way;
 * it went unnoticed because the endpoint was cookie-only and no MCP client
 * could ever reach it.
 */
function rpcResult(id: string | number | null, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", result, id });
}

/** A `tools/call` result. This is the shape that carries a content block. */
function rpcToolResult(id: string | number | null, payload: unknown) {
  return NextResponse.json({
    jsonrpc: "2.0",
    result: { content: [{ type: "text", text: JSON.stringify(payload) }] },
    id,
  });
}

function rpcError(id: string | number | null, message: string, code = -32000) {
  return NextResponse.json({ jsonrpc: "2.0", error: { code, message }, id });
}

// ─── Auth helper ─────────────────────────────────────────────────

/**
 * Session OR repo API token.
 *
 * The session branch is the dashboard. The Bearer branch is what makes this
 * server reachable at all from an agent: an MCP client carries no cookie, so
 * cookie-only auth meant every tool here was unreachable outside the browser.
 * Same `gg_…` token the SDK already uses, same SHA-256 comparison.
 *
 * A token also pins the caller to one repo, which is what the issue tools want
 * anyway — a token for repo X can never comment on repo Y.
 */
async function authenticateMcp(
  request: NextRequest
): Promise<{ userId: string; repoId: string | null } | null> {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const presented = header.slice("Bearer ".length).trim();

    // OAuth first: a `gg_` prefix marks the manual API token, so anything else
    // is tried as an OAuth access token. Both stay supported on purpose — the
    // browser flow is for humans, the API token for CI and headless agents that
    // have no browser to approve in.
    if (!presented.startsWith("gg_")) {
      const granted = await verifyAccessToken(presented);
      // OAuth grants cover every repo the user owns, so no repo is pinned here;
      // each tool re-checks ownership against the userId.
      return granted ? { userId: granted.userId, repoId: null } : null;
    }

    const tokenHash = hashToken(presented);
    const apiToken = await prisma.apiToken.findUnique({
      where: { tokenHash },
      select: { repoId: true, expiresAt: true, repo: { select: { userId: true } } },
    });
    if (!apiToken) return null;
    if (apiToken.expiresAt && apiToken.expiresAt < new Date()) return null;
    // Best-effort: a failed touch must not fail the call.
    void prisma.apiToken
      .update({ where: { tokenHash }, data: { lastUsed: new Date() } })
      .catch(() => {});
    return { userId: apiToken.repo.userId, repoId: apiToken.repoId };
  }

  const session = await auth();
  if (!session?.user?.id) return null;
  return { userId: session.user.id, repoId: null };
}

// ─── Tool definitions ────────────────────────────────────────────

const TOOLS = [
  {
    name: "list_repos",
    description: "List all connected GitHub repositories for the authenticated user.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_reports",
    description: "Get recent bug reports, optionally filtered by repo or status.",
    inputSchema: {
      type: "object",
      properties: {
        repoId: { type: "string", description: "Filter by repo ID" },
        status: {
          type: "string",
          enum: ["PENDING", "PROCESSING", "CREATED", "DUPLICATE", "FAILED"],
          description: "Filter by report status",
        },
        limit: { type: "number", description: "Max results (default 20, max 50)" },
      },
      required: [],
    },
  },
  {
    name: "get_indexing_status",
    description: "Get cached GSC indexing summary (indexed/notIndexed counts) from last sync.",
    inputSchema: {
      type: "object",
      properties: {
        siteUrl: { type: "string", description: "Filter by site URL" },
      },
      required: [],
    },
  },
  {
    name: "list_not_indexed_pages",
    description:
      "Fetch not-indexed pages live from Google Search Console. Uses API quota (2000 req/day). Returns up to 100 URLs with reasons.",
    inputSchema: {
      type: "object",
      properties: {
        siteUrl: { type: "string", description: "The GSC site URL to check (required)" },
        limit: { type: "number", description: "Max URLs to check (default 20, max 100)" },
      },
      required: ["siteUrl"],
    },
  },
  {
    name: "request_reindex",
    description:
      "Submit not-indexed pages for re-crawling via the Google Indexing API. Fetches sitemap live, inspects URLs, submits not-indexed ones. Max 200/day.",
    inputSchema: {
      type: "object",
      properties: {
        siteUrl: { type: "string", description: "The GSC site URL to reindex" },
      },
      required: ["siteUrl"],
    },
  },
  {
    name: "create_image_upload_url",
    description:
      "Get a short-lived presigned URL to upload one image, plus the public URL it will be served from. Upload the bytes yourself with `curl -X PUT -H 'Content-Type: <contentType>' --data-binary @<file> '<uploadUrl>'`, then use the returned publicUrl in markdown — it renders in GitHub issue comments even on private repos. Use this before comment_on_issue when you have screenshots to attach.",
    inputSchema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Original file name, e.g. after-unfiltered.png" },
        contentType: {
          type: "string",
          description: "Image MIME type, e.g. image/png or image/jpeg",
        },
      },
      required: ["filename", "contentType"],
    },
  },
  {
    name: "get_issue",
    description:
      "Read one GitHub issue from a repo connected to Glitchgrab: title, body, state, labels, author and its comments. Use this before commenting so you know what was already reported and answered. The reporter's screenshot and repro steps live in the body.",
    inputSchema: {
      type: "object",
      properties: {
        repoFullName: {
          type: "string",
          description: "owner/name, e.g. Navibyte-Innovations-Pvt-Ltd/practise_stack. Optional when the API token already pins one repo.",
        },
        issueNumber: { type: "number", description: "Issue number to read" },
        commentLimit: {
          type: "number",
          description: "Max comments to return, newest kept (default 30, max 100). Pass 0 to skip comments.",
        },
      },
      required: ["issueNumber"],
    },
  },
  {
    name: "comment_on_issue",
    description:
      "Post a comment on a GitHub issue as the Glitchgrab app, on a repo connected to Glitchgrab. Markdown, including image links from create_image_upload_url. Does not close or reopen the issue.",
    inputSchema: {
      type: "object",
      properties: {
        repoFullName: {
          type: "string",
          description: "owner/name, e.g. Navibyte-Innovations-Pvt-Ltd/practise_stack. Optional when the API token already pins one repo.",
        },
        issueNumber: { type: "number", description: "Issue number to comment on" },
        body: { type: "string", description: "Comment body in GitHub markdown" },
      },
      required: ["issueNumber", "body"],
    },
  },
];

// ─── Tool handlers ───────────────────────────────────────────────

async function handleListRepos(userId: string) {
  const repos = await prisma.repo.findMany({
    where: visibleRepoWhere(userId),
    select: {
      id: true,
      fullName: true,
      isPrivate: true,
      _count: { select: { reports: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return repos.map((r: { id: string; fullName: string; isPrivate: boolean; _count: { reports: number } }) => ({
    id: r.id,
    fullName: r.fullName,
    isPrivate: r.isPrivate,
    reports: r._count.reports,
  }));
}

async function handleGetReports(userId: string, params: Record<string, unknown>) {
  const repoId = typeof params.repoId === "string" ? params.repoId : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const limit = Math.min(Number(params.limit) || 20, 50);

  return prisma.report.findMany({
    where: {
      repo: visibleRepoWhere(userId),
      ...(repoId ? { repoId } : {}),
      ...(status ? { status: status as never } : {}),
    },
    select: { id: true, source: true, status: true, pageUrl: true, failReason: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

async function handleGetIndexingStatus(userId: string, params: Record<string, unknown>) {
  const siteUrl = typeof params.siteUrl === "string" ? params.siteUrl : undefined;

  const properties = await prisma.gscProperty.findMany({
    where: { userId, ...(siteUrl ? { siteUrl } : {}) },
    select: { siteUrl: true, indexedCount: true, notIndexedCount: true, lastSyncAt: true },
  });

  return properties.map((p: { siteUrl: string; indexedCount: number; notIndexedCount: number; lastSyncAt: Date | null }) => ({
    siteUrl: p.siteUrl,
    indexed: p.indexedCount,
    notIndexed: p.notIndexedCount,
    lastSyncAt: p.lastSyncAt,
    note: p.lastSyncAt ? undefined : "No sync run yet — use sync button in dashboard first",
  }));
}

async function handleListNotIndexedPages(userId: string, params: Record<string, unknown>) {
  const siteUrl = typeof params.siteUrl === "string" ? params.siteUrl : null;
  if (!siteUrl) throw new Error("siteUrl is required");
  const limit = Math.min(Number(params.limit) || 20, 100);

  const property = await prisma.gscProperty.findFirst({ where: { userId, siteUrl } });
  if (!property) throw new Error("GSC property not found");

  const accessToken = await getValidAccessToken(property.id);
  if (!accessToken) throw new Error("No valid access token. Please reconnect GSC in dashboard.");

  const sitemapUrls = await getSitemapUrls(accessToken, siteUrl);
  const urlsToCheck = sitemapUrls.slice(0, limit);

  const notIndexedPages: Array<{ url: string; reason?: string }> = [];
  for (const url of urlsToCheck) {
    try {
      const result = await inspectUrl(accessToken, siteUrl, url);
      if (!result.indexed) notIndexedPages.push({ url, reason: result.reason });
    } catch {
      // Skip
    }
  }

  return { checked: urlsToCheck.length, notIndexed: notIndexedPages };
}

async function handleRequestReindex(userId: string, params: Record<string, unknown>) {
  const siteUrl = typeof params.siteUrl === "string" ? params.siteUrl : null;
  if (!siteUrl) throw new Error("siteUrl is required");

  const property = await prisma.gscProperty.findFirst({ where: { userId, siteUrl } });
  if (!property) throw new Error("GSC property not found");

  const accessToken = await getValidAccessToken(property.id);
  if (!accessToken) throw new Error("No valid access token. Please reconnect GSC in dashboard.");

  const sitemapUrls = await getSitemapUrls(accessToken, siteUrl);
  const urlsToCheck = sitemapUrls.slice(0, 200);

  const notIndexedUrls: string[] = [];
  for (const url of urlsToCheck) {
    try {
      const result = await inspectUrl(accessToken, siteUrl, url);
      if (!result.indexed) notIndexedUrls.push(url);
    } catch {
      // Skip
    }
  }

  let submitted = 0;
  for (const url of notIndexedUrls) {
    try {
      await requestIndexing(accessToken, url);
      submitted++;
    } catch {
      // Skip per-URL failures
    }
  }

  return { submitted, checked: urlsToCheck.length };
}

async function handleCreateImageUploadUrl(params: Record<string, unknown>) {
  const filename = typeof params.filename === "string" ? params.filename : null;
  const contentType = typeof params.contentType === "string" ? params.contentType : null;
  if (!filename) throw new Error("filename is required");
  if (!contentType) throw new Error("contentType is required");
  if (!contentType.startsWith("image/")) {
    throw new Error(`contentType must be an image/* type, got "${contentType}"`);
  }

  const result = await createScreenshotUploadUrl(filename, contentType);
  if (!result) throw new Error("Upload URL could not be created — S3 is not configured");

  return {
    uploadUrl: result.uploadUrl,
    publicUrl: result.publicUrl,
    expiresInSeconds: 900,
    uploadWith: `curl -X PUT -H "Content-Type: ${contentType}" --data-binary @<file> "${result.uploadUrl}"`,
    note: "Upload the bytes before using publicUrl — the URL 404s until the PUT succeeds.",
  };
}

/**
 * Resolves the repo a caller may act on, for both issue tools.
 *
 * Scoped twice over: a Bearer API token pins one repo outright, and any other
 * caller can only reach repos `visibleRepoWhere` allows. Neither path lets a
 * caller name an arbitrary `owner/name` and have it acted on.
 */
async function resolveIssueRepo(
  userId: string,
  tokenRepoId: string | null,
  repoFullName: string | null
) {
  const repo = await prisma.repo.findFirst({
    where: tokenRepoId
      ? { id: tokenRepoId, ...(repoFullName ? { fullName: repoFullName } : {}) }
      : { fullName: repoFullName ?? undefined, ...visibleRepoWhere(userId) },
    select: {
      fullName: true,
      owner: true,
      name: true,
      installation: { select: { installationId: true } },
    },
  });

  if (!repo) {
    throw new Error(
      repoFullName
        ? `Repo "${repoFullName}" is not connected to Glitchgrab, or this token does not cover it`
        : "repoFullName is required — this token is not pinned to a single repo"
    );
  }
  if (!repo.installation?.installationId) {
    throw new Error(
      `The Glitchgrab GitHub App is not installed on ${repo.fullName} — install it to use the issue tools`
    );
  }
  return repo as typeof repo & { installation: { installationId: number } };
}

async function handleGetIssue(
  userId: string,
  tokenRepoId: string | null,
  params: Record<string, unknown>
) {
  const issueNumber = Number(params.issueNumber);
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error("issueNumber must be a positive integer");
  }
  const repoFullName = typeof params.repoFullName === "string" ? params.repoFullName : null;
  const commentLimit =
    params.commentLimit === undefined ? 30 : Math.max(0, Math.min(Number(params.commentLimit), 100));

  if (!tokenRepoId && !repoFullName) {
    throw new Error("repoFullName is required — this token is not pinned to a single repo");
  }

  const repo = await resolveIssueRepo(userId, tokenRepoId, repoFullName);
  const token = await getInstallationAccessToken(repo.installation.installationId);
  const issue = await getGitHubIssueDetail(token, repo.owner, repo.name, issueNumber, commentLimit);

  if (!issue) {
    throw new Error(
      `Issue #${issueNumber} was not found on ${repo.fullName} (it may be a pull request, which this tool does not read)`
    );
  }
  return { repo: repo.fullName, ...issue };
}

/**
 * Comments as the GitHub App, not as a person. The App is what already files
 * these issues, so a fix note lands in the same thread under the same identity.
 *
 * Repo resolution is scoped twice over: a Bearer token pins one repo outright,
 * and a session caller can still only reach repos they own. Neither path lets a
 * caller name an arbitrary `owner/name` and have it posted to.
 */
async function handleCommentOnIssue(
  userId: string,
  tokenRepoId: string | null,
  params: Record<string, unknown>
) {
  const issueNumber = Number(params.issueNumber);
  const body = typeof params.body === "string" ? params.body : null;
  const repoFullName = typeof params.repoFullName === "string" ? params.repoFullName : null;

  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error("issueNumber must be a positive integer");
  }
  if (!body || body.trim().length === 0) throw new Error("body is required");
  // Without this, a session caller who omits repoFullName falls through to a
  // repo they merely happen to own. A token pins the repo; anyone else names one.
  if (!tokenRepoId && !repoFullName) {
    throw new Error("repoFullName is required — this token is not pinned to a single repo");
  }

  const repo = await resolveIssueRepo(userId, tokenRepoId, repoFullName);
  const installationToken = await getInstallationAccessToken(repo.installation.installationId);
  await commentOnGitHubIssue(installationToken, repo.owner, repo.name, issueNumber, body);

  return {
    posted: true,
    repo: repo.fullName,
    issueNumber,
    url: `https://github.com/${repo.fullName}/issues/${issueNumber}`,
  };
}

// ─── Route handlers ──────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({ name: "glitchgrab-mcp", version: "1.0.0" });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateMcp(request);
  if (!auth) {
    // RFC 9728 §5.1. Without this header a client has no way to find the
    // authorization server, so the 401 is terminal instead of the first step of
    // a connect flow — which is exactly why this endpoint used to be unreachable
    // from any agent.
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": `Bearer resource_metadata="${publicOrigin()}/.well-known/oauth-protected-resource"`,
        },
      }
    );
  }

  let body: JsonRpcRequest;
  try {
    body = (await request.json()) as JsonRpcRequest;
  } catch {
    return rpcError(null, "Invalid JSON", -32700);
  }

  const { method, params = {}, id } = body;

  try {
    switch (method) {
      case "initialize": {
        // Echo the client's version when it is one we speak, so a newer client
        // is not forced down to our default.
        const asked = (params as { protocolVersion?: string }).protocolVersion;
        const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];
        return rpcResult(id, {
          protocolVersion: asked && SUPPORTED.includes(asked) ? asked : "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "glitchgrab", version: "1.0.0" },
        });
      }

      // Notifications carry no id and MUST NOT get a JSON-RPC result back.
      case "notifications/initialized":
      case "notifications/cancelled":
        return new NextResponse(null, { status: 202 });

      case "tools/list":
        return rpcResult(id, { tools: TOOLS });

      case "tools/call": {
        const toolName = (params as { name?: string }).name;
        const toolArgs = ((params as { arguments?: Record<string, unknown> }).arguments) ?? {};

        switch (toolName) {
          case "list_repos":
            return rpcToolResult(id, await handleListRepos(auth.userId));
          case "get_reports":
            return rpcToolResult(id, await handleGetReports(auth.userId, toolArgs));
          case "get_indexing_status":
            return rpcToolResult(id, await handleGetIndexingStatus(auth.userId, toolArgs));
          case "list_not_indexed_pages":
            return rpcToolResult(id, await handleListNotIndexedPages(auth.userId, toolArgs));
          case "request_reindex":
            return rpcToolResult(id, await handleRequestReindex(auth.userId, toolArgs));
          case "create_image_upload_url":
            return rpcToolResult(id, await handleCreateImageUploadUrl(toolArgs));
          case "get_issue":
            return rpcToolResult(id, await handleGetIssue(auth.userId, auth.repoId, toolArgs));
          case "comment_on_issue":
            return rpcToolResult(id, await handleCommentOnIssue(auth.userId, auth.repoId, toolArgs));
          default:
            return rpcError(id, `Unknown tool: ${toolName}`, -32601);
        }
      }

      default:
        return rpcError(id, `Method not found: ${method}`, -32601);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return rpcError(id, message);
  }
}
