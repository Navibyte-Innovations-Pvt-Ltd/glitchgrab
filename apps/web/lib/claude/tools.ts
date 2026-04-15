import type Anthropic from "@anthropic-ai/sdk";
import type { AiAction, ClarifyQuestion } from "@/lib/ai-types";
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

// ─── Emit tools ─────────────────────────────────────────
// Structured terminal tools. When the model calls one of these, we read its
// tool_use.input directly as the final action — no text parsing. Anthropic
// guarantees tool inputs conform to the declared schema.

export const EMIT_TOOL_NAMES = new Set([
  "create_issue",
  "update_issue",
  "close_issues",
  "merge_issues",
  "clarify",
  "emit_chat",
]);

export const EMIT_TOOL_SCHEMAS: Anthropic.Tool[] = [
  {
    name: "create_issue",
    description:
      "Emit a 'create' action to open a new GitHub issue. Call this when the report is an unambiguous new bug or feature and you know enough to write a scoped ticket.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Issue title, ≤80 chars." },
        body: {
          type: "string",
          description:
            "Markdown body with ## Description, ## Steps to Reproduce, ## Expected Behavior, ## Actual Behavior, ## Relevant Files (cite real paths), ## Additional Context.",
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Labels like 'bug', 'ui', 'mobile'.",
        },
        severity: {
          type: "string",
          enum: ["critical", "high", "medium", "low"],
        },
      },
      required: ["title", "body", "labels", "severity"],
    },
  },
  {
    name: "update_issue",
    description:
      "Emit an 'update' action to add a comment to an existing issue. Use when a recently-opened issue already covers the same area, or when the user asks to attach context to a specific issue number.",
    input_schema: {
      type: "object",
      properties: {
        issueNumber: { type: "number" },
        comment: { type: "string", description: "Markdown comment." },
      },
      required: ["issueNumber", "comment"],
    },
  },
  {
    name: "close_issues",
    description:
      "Emit a 'close' action. Only use when the user EXPLICITLY said to close the issue(s) by number or 'close all'.",
    input_schema: {
      type: "object",
      properties: {
        issueNumbers: {
          type: "array",
          items: { type: "number" },
        },
        comment: { type: "string" },
      },
      required: ["issueNumbers", "comment"],
    },
  },
  {
    name: "merge_issues",
    description:
      "Emit a 'merge' action. Only use when the user EXPLICITLY asked to merge/combine specific issue numbers.",
    input_schema: {
      type: "object",
      properties: {
        keepIssue: { type: "number" },
        closeIssues: { type: "array", items: { type: "number" } },
        mergedTitle: { type: "string" },
        mergedBody: {
          type: "string",
          description:
            "Comprehensive merged body preserving ALL content from every merged issue with clear sections.",
        },
      },
      required: ["keepIssue", "closeIssues", "mergedTitle", "mergedBody"],
    },
  },
  {
    name: "clarify",
    description:
      "Emit a 'clarify' action with EXACTLY ONE grounded question. Use only when the code does not resolve the ambiguity. Options must be 2–4 concrete repo-grounded choices (real paths / component names), not generic labels.",
    input_schema: {
      type: "object",
      properties: {
        question: { type: "string" },
        options: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 4,
        },
      },
      required: ["question", "options"],
    },
  },
  {
    name: "emit_chat",
    description:
      "Emit a 'chat' reply. Use for greetings, repo status questions, or a polite 'a human will review this' fallback when the report is too vague to even clarify.",
    input_schema: {
      type: "object",
      properties: {
        message: { type: "string" },
      },
      required: ["message"],
    },
  },
];

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

// Parse an emit-tool use block into an AiAction. Anthropic validates the
// input against the declared schema, but we still defensively coerce so a
// malformed/partial input doesn't throw at the edge.
export function actionFromEmitTool(
  name: string,
  rawInput: unknown,
): AiAction | null {
  const input = (rawInput ?? {}) as Record<string, unknown>;

  if (name === "create_issue") {
    const labels = Array.isArray(input.labels) ? input.labels.map(String) : ["bug"];
    return {
      intent: "create",
      title: String(input.title ?? "Bug report").slice(0, 80),
      body: String(input.body ?? ""),
      labels: labels.length > 0 ? labels : ["bug"],
      severity: String(input.severity ?? "medium"),
    };
  }
  if (name === "update_issue") {
    const n = Number(input.issueNumber);
    if (!Number.isFinite(n) || n <= 0) return null;
    return {
      intent: "update",
      issueNumber: n,
      comment: String(input.comment ?? ""),
    };
  }
  if (name === "close_issues") {
    const nums = Array.isArray(input.issueNumbers)
      ? input.issueNumbers.map(Number).filter((n) => Number.isFinite(n))
      : [];
    if (nums.length === 0) return null;
    return {
      intent: "close",
      issueNumbers: nums,
      comment: String(input.comment ?? "Closed via Glitchgrab"),
    };
  }
  if (name === "merge_issues") {
    const keep = Number(input.keepIssue);
    if (!Number.isFinite(keep) || keep <= 0) return null;
    const closeNums = Array.isArray(input.closeIssues)
      ? input.closeIssues.map(Number).filter((n) => Number.isFinite(n))
      : [];
    return {
      intent: "merge",
      keepIssue: keep,
      closeIssues: closeNums,
      mergedTitle: String(input.mergedTitle ?? ""),
      mergedBody: String(input.mergedBody ?? ""),
    };
  }
  if (name === "clarify") {
    const q = String(input.question ?? "").trim();
    if (!q) return null;
    const options = Array.isArray(input.options)
      ? input.options.map(String).slice(0, 4)
      : [];
    const questions: ClarifyQuestion[] = [{ question: q, options }];
    return { intent: "clarify", questions };
  }
  if (name === "emit_chat") {
    return {
      intent: "chat",
      message: String(input.message ?? "I'm not sure how to help with that."),
    };
  }
  return null;
}

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
