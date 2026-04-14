import type Anthropic from "@anthropic-ai/sdk";
import { getCache, setCache, TTL } from "./cache";
import type { ToolContext } from "./types";

const GITHUB_API = "https://api.github.com";
const USER_AGENT = "Glitchgrab/1.0";

const MAX_FILE_BYTES = 40_000;
const MAX_TREE_ENTRIES = 400;
const MAX_SEARCH_RESULTS = 15;

function ghHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": USER_AGENT,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export const TOOL_SCHEMAS: Anthropic.Tool[] = [
  {
    name: "list_repo_tree",
    description:
      "List files and directories in the repository. Use this to see the project structure and figure out which folders or files are relevant to the bug report. Returns up to 400 entries.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Directory path relative to repo root. Use '' or omit for repo root. Example: 'apps/web/app/dashboard'.",
        },
      },
    },
  },
  {
    name: "read_file",
    description:
      "Read the contents of a single file in the repository. Returns up to 40KB of text. Use this AFTER narrowing down with list_repo_tree or search_code — don't read random files.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "File path relative to repo root. Example: 'apps/web/app/dashboard/page.tsx'.",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "search_code",
    description:
      "Search the repository's code for a keyword or phrase using GitHub code search. Useful for finding where a symbol/component/string is defined or used. Returns up to 15 matching files with code snippets.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search query. Keep it focused — e.g. 'ChatPanel', 'useAuth', 'getDashboard'. Avoid vague words.",
        },
      },
      required: ["query"],
    },
  },
];

interface ToolRunResult {
  content: string;
  isError: boolean;
  cacheHit: boolean;
}

export async function runTool(
  name: string,
  rawInput: unknown,
  ctx: ToolContext,
): Promise<ToolRunResult> {
  const input = (rawInput ?? {}) as Record<string, unknown>;

  // Reject any attempt to override repo context via tool args.
  if ("owner" in input || "repo" in input || "installationId" in input) {
    console.warn("[claude-enricher] cross-repo attempt blocked", {
      tool: name,
      attempted: { owner: input.owner, repo: input.repo },
      allowed: { owner: ctx.owner, repo: ctx.repo },
    });
    return {
      content:
        "Error: this tool does not accept 'owner', 'repo', or 'installationId' arguments. The repo is fixed for the life of this request.",
      isError: true,
      cacheHit: false,
    };
  }

  try {
    if (name === "list_repo_tree") {
      return await listRepoTree(String(input.path ?? ""), ctx);
    }
    if (name === "read_file") {
      const path = typeof input.path === "string" ? input.path : "";
      if (!path) {
        return { content: "Error: 'path' is required.", isError: true, cacheHit: false };
      }
      return await readFile(path, ctx);
    }
    if (name === "search_code") {
      const query = typeof input.query === "string" ? input.query.trim() : "";
      if (!query) {
        return { content: "Error: 'query' is required.", isError: true, cacheHit: false };
      }
      return await searchCode(query, ctx);
    }
    return {
      content: `Error: unknown tool '${name}'.`,
      isError: true,
      cacheHit: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: `Error: ${message}`,
      isError: true,
      cacheHit: false,
    };
  }
}

// ─── list_repo_tree ─────────────────────────────────────

async function listRepoTree(
  path: string,
  ctx: ToolContext,
): Promise<ToolRunResult> {
  const cleanedPath = path.replace(/^\/+|\/+$/g, "");
  const cacheKey = `tree:${ctx.owner}/${ctx.repo}:${cleanedPath}`;
  const cached = getCache<string>(cacheKey);
  if (cached) return { content: cached, isError: false, cacheHit: true };

  // Fetch the default branch's full recursive tree once, then filter by path prefix.
  const rootKey = `tree_root:${ctx.owner}/${ctx.repo}`;
  let rootEntries = getCache<{ path: string; type: string }[]>(rootKey);
  let rootFromCache = true;
  if (!rootEntries) {
    rootFromCache = false;
    rootEntries = await fetchRootTree(ctx);
    setCache(rootKey, rootEntries, TTL.TREE);
  }

  const prefix = cleanedPath ? `${cleanedPath}/` : "";
  const filtered = rootEntries
    .filter((e) => (cleanedPath ? e.path.startsWith(prefix) : true))
    .filter((e) => {
      const rel = cleanedPath ? e.path.slice(prefix.length) : e.path;
      // Only show entries up to 2 levels below the requested path to keep output bounded.
      return rel.split("/").length <= 2;
    });

  const truncated = filtered.length > MAX_TREE_ENTRIES;
  const shown = filtered.slice(0, MAX_TREE_ENTRIES);
  const lines = shown.map((e) => {
    const icon = e.type === "tree" ? "dir " : "file";
    return `${icon}  ${e.path}`;
  });

  const header = cleanedPath
    ? `Tree under '${cleanedPath}' (depth ≤ 2):`
    : "Repository tree (depth ≤ 2):";
  const footer = truncated
    ? `\n… ${filtered.length - MAX_TREE_ENTRIES} more entries not shown. Narrow with a deeper path.`
    : "";
  const body = lines.length > 0 ? lines.join("\n") : "(no entries)";
  const output = `${header}\n${body}${footer}`;

  setCache(cacheKey, output, TTL.TREE);
  return { content: output, isError: false, cacheHit: rootFromCache };
}

async function fetchRootTree(
  ctx: ToolContext,
): Promise<{ path: string; type: string }[]> {
  const repoUrl = `${GITHUB_API}/repos/${ctx.owner}/${ctx.repo}`;
  const repoRes = await fetch(repoUrl, { headers: ghHeaders(ctx.accessToken) });
  if (!repoRes.ok) {
    throw new Error(`GitHub repo fetch failed (${repoRes.status})`);
  }
  const repoData = (await repoRes.json()) as { default_branch: string };
  const branch = repoData.default_branch ?? "main";

  const treeUrl = `${GITHUB_API}/repos/${ctx.owner}/${ctx.repo}/git/trees/${branch}?recursive=1`;
  const treeRes = await fetch(treeUrl, { headers: ghHeaders(ctx.accessToken) });
  if (!treeRes.ok) {
    throw new Error(`GitHub tree fetch failed (${treeRes.status})`);
  }
  const treeData = (await treeRes.json()) as {
    tree: { path: string; type: string }[];
    truncated: boolean;
  };
  return treeData.tree
    .filter((e) => e.type === "blob" || e.type === "tree")
    .map((e) => ({ path: e.path, type: e.type }));
}

// ─── read_file ──────────────────────────────────────────

async function readFile(
  path: string,
  ctx: ToolContext,
): Promise<ToolRunResult> {
  const cleanedPath = path.replace(/^\/+/, "");
  const cacheKey = `file:${ctx.owner}/${ctx.repo}:${cleanedPath}`;
  const cached = getCache<string>(cacheKey);
  if (cached) return { content: cached, isError: false, cacheHit: true };

  const url = `${GITHUB_API}/repos/${ctx.owner}/${ctx.repo}/contents/${encodeURI(cleanedPath)}`;
  const res = await fetch(url, {
    headers: {
      ...ghHeaders(ctx.accessToken),
      Accept: "application/vnd.github.raw",
    },
  });
  if (res.status === 404) {
    return {
      content: `File '${cleanedPath}' not found in ${ctx.owner}/${ctx.repo}.`,
      isError: false,
      cacheHit: false,
    };
  }
  if (!res.ok) {
    throw new Error(`GitHub file fetch failed (${res.status})`);
  }
  const text = await res.text();
  const body = text.length > MAX_FILE_BYTES ? `${text.slice(0, MAX_FILE_BYTES)}\n… (truncated — file is ${text.length} chars)` : text;
  const output = `File: ${cleanedPath}\n---\n${body}`;
  setCache(cacheKey, output, TTL.FILE);
  return { content: output, isError: false, cacheHit: false };
}

// ─── search_code ────────────────────────────────────────

async function searchCode(
  query: string,
  ctx: ToolContext,
): Promise<ToolRunResult> {
  const normalized = query.toLowerCase().replace(/\s+/g, " ");
  const cacheKey = `search:${ctx.owner}/${ctx.repo}:${normalized}`;
  const cached = getCache<string>(cacheKey);
  if (cached) return { content: cached, isError: false, cacheHit: true };

  const scoped = `${query} repo:${ctx.owner}/${ctx.repo}`;
  const url = `${GITHUB_API}/search/code?q=${encodeURIComponent(scoped)}&per_page=${MAX_SEARCH_RESULTS}`;
  const res = await fetch(url, {
    headers: {
      ...ghHeaders(ctx.accessToken),
      Accept: "application/vnd.github.text-match+json",
    },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`GitHub code search failed (${res.status}): ${errText.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    total_count: number;
    items: {
      path: string;
      text_matches?: { fragment: string }[];
    }[];
  };

  if (data.total_count === 0 || data.items.length === 0) {
    const output = `No results for '${query}' in ${ctx.owner}/${ctx.repo}.`;
    setCache(cacheKey, output, TTL.SEARCH);
    return { content: output, isError: false, cacheHit: false };
  }

  const lines: string[] = [
    `Search results for '${query}' in ${ctx.owner}/${ctx.repo} (showing ${data.items.length} of ${data.total_count}):`,
  ];
  for (const item of data.items) {
    lines.push(`\n${item.path}`);
    const fragments = item.text_matches?.slice(0, 2) ?? [];
    for (const frag of fragments) {
      const snippet = frag.fragment.replace(/\n/g, " ").slice(0, 200);
      lines.push(`  ↳ ${snippet}`);
    }
  }
  const output = lines.join("\n");
  setCache(cacheKey, output, TTL.SEARCH);
  return { content: output, isError: false, cacheHit: false };
}
