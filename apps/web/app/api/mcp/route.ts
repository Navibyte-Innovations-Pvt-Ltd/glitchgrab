export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getValidAccessToken } from "@/lib/gsc-tokens";
import { getSitemapUrls, inspectUrl, requestIndexing } from "@/lib/gsc";

// ─── JSON-RPC helpers ────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
  id: string | number | null;
}

function rpcResult(id: string | number | null, result: unknown) {
  return NextResponse.json({
    jsonrpc: "2.0",
    result: { content: [{ type: "text", text: JSON.stringify(result) }] },
    id,
  });
}

function rpcError(id: string | number | null, message: string, code = -32000) {
  return NextResponse.json({ jsonrpc: "2.0", error: { code, message }, id });
}

// ─── Auth helper ─────────────────────────────────────────────────

async function authenticateMcp(): Promise<{ userId: string } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { userId: session.user.id };
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
];

// ─── Tool handlers ───────────────────────────────────────────────

async function handleListRepos(userId: string) {
  const repos = await prisma.repo.findMany({
    where: { userId },
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
      repo: { userId },
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

// ─── Route handlers ──────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({ name: "glitchgrab-mcp", version: "1.0.0" });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateMcp();
  if (!auth) {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null },
      { status: 401 }
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
      case "initialize":
        return rpcResult(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "glitchgrab", version: "1.0.0" },
        });

      case "tools/list":
        return rpcResult(id, { tools: TOOLS });

      case "tools/call": {
        const toolName = (params as { name?: string }).name;
        const toolArgs = ((params as { arguments?: Record<string, unknown> }).arguments) ?? {};

        switch (toolName) {
          case "list_repos":
            return rpcResult(id, await handleListRepos(auth.userId));
          case "get_reports":
            return rpcResult(id, await handleGetReports(auth.userId, toolArgs));
          case "get_indexing_status":
            return rpcResult(id, await handleGetIndexingStatus(auth.userId, toolArgs));
          case "list_not_indexed_pages":
            return rpcResult(id, await handleListNotIndexedPages(auth.userId, toolArgs));
          case "request_reindex":
            return rpcResult(id, await handleRequestReindex(auth.userId, toolArgs));
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
