#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { GlitchgrabClient, DEFAULT_BASE_URL, GlitchgrabError } from "./client.js";

/**
 * The Glitchgrab MCP server — the project, addressable by a coding agent.
 *
 * An agent working in an editor has the code and nothing else. This gives it
 * the other half: what is already reported, what the team calls things, and a
 * way to file what it finds without leaving the editor or inventing its own
 * path to GitHub.
 *
 * Two rules hold the whole design up:
 *
 * 1. **The repo comes from the token.** No tool takes a project, an owner or a
 *    repo id. One token is one repo, so an agent cannot aim a report at a
 *    project it was not given — not by being wrong, and not by being talked
 *    into it by something it read in a file.
 *
 * 2. **No privileged path.** `report_bug` posts to the same endpoint the SDK
 *    posts to, and lands in the same deterministic build-body → S3 → GitHub
 *    pipeline with the same dedup. Nothing here can create an issue that a
 *    person could not have created by typing.
 *
 * It reports. It does not write to the repo, open pull requests, or change
 * code — an agent that can both diagnose and silently rewrite is a different
 * product with a different trust story.
 */

const token = process.env.GLITCHGRAB_TOKEN;
const baseUrl = process.env.GLITCHGRAB_BASE_URL ?? DEFAULT_BASE_URL;

if (!token) {
  // stderr, never stdout: stdout is the MCP transport itself, and a stray line
  // there corrupts the protocol rather than showing anyone a message.
  console.error(
    "GLITCHGRAB_TOKEN is not set. Create a token in the Glitchgrab dashboard " +
      "(API Tokens → the repo you want) and set it in your MCP config."
  );
  process.exit(1);
}

const client = new GlitchgrabClient(token, baseUrl);
const server = new McpServer({ name: "glitchgrab", version: "0.1.0" });

/** Tool results are text; an error the person running the agent can act on. */
function fail(error: unknown) {
  const message =
    error instanceof GlitchgrabError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Unknown error";
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

function ok(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

/**
 * Schemas live outside the registration calls.
 *
 * Inlined, the SDK's generic inference chains through every `.describe()` and
 * TypeScript gives up with "type instantiation is excessively deep". Naming
 * them costs nothing and keeps the tool definitions readable.
 */
type Shape = Record<string, z.ZodTypeAny>;

/** What a tool hands back: JSON as text, or an error the operator can act on. */
interface ToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

/**
 * Registering a tool, without the type explosion.
 *
 * `server.registerTool` infers the handler's argument type from the zod shape,
 * and with zod v3 that inference walks every `.describe()` and every enum until
 * TypeScript bails out with "type instantiation is excessively deep". The casts
 * are confined to this one function; each tool below still declares the exact
 * arguments it expects, and zod still validates them at runtime — which is the
 * check that actually matters, since the caller is a model.
 */
function defineTool<Args>(
  name: string,
  description: string,
  inputSchema: Shape,
  run: (args: Args) => Promise<ToolResult>
): void {
  (server.registerTool as (n: string, c: unknown, cb: unknown) => unknown)(
    name,
    { description, inputSchema },
    run
  );
}

const listOpenIssuesInput: Shape = {
  query: z
    .string()
    .optional()
    .describe("What you are working on, in a few words. Ranks the list; never filters it away."),
  limit: z.number().int().min(1).max(100).optional(),
};

const listReportsInput: Shape = {
  status: z.enum(["PENDING", "CREATED", "DUPLICATE", "FAILED"]).optional(),
  limit: z.number().int().min(1).max(50).optional(),
};

const reportBugInput: Shape = {
  description: z
    .string()
    .min(10)
    .describe(
      "What is wrong, where, and what was expected. Write it for the person who " +
        "will fix it — no file paths guessed, no cause invented."
    ),
  type: z
    .enum([
      "BUG",
      "FEATURE_REQUEST",
      "UI_IMPROVEMENT",
      "PERFORMANCE",
      "SECURITY",
      "QUESTION",
      "OTHER",
    ])
    .optional(),
  reporter_name: z
    .string()
    .optional()
    .describe("Who is filing. Defaults to the agent, so a human is never impersonated."),
  existing_issue: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "An open issue number from list_open_issues that this is the same problem as. " +
        "The report is added there as a comment. The server re-checks the number " +
        "against the repo, so a wrong one just files normally."
    ),
};

defineTool<{ query?: string; limit?: number }>(
  "list_open_issues",
  "List the open GitHub issues on this project. Use BEFORE reporting anything, " +
    "and before starting work on a bug — the team may already have it filed. " +
    "Pass `query` to rank the list against what you are looking at. Returns " +
    "numbers, titles and URLs only.",
  listOpenIssuesInput,
  async ({ query, limit }) => {
    try {
      return ok(await client.listOpenIssues(query, limit ?? 30));
    } catch (error) {
      return fail(error);
    }
  }
);

defineTool<Record<string, never>>(
  "get_project_context",
  "Read this project's GLITCH.md brief — the roles who file reports, the areas " +
    "of the product, what the team calls things, what is known-broken, and what " +
    "they do not want reported — plus any notes from the dashboard. Read this " +
    "before writing a report so it uses the team's own words.",
  {},
  async () => {
    try {
      return ok(await client.getProjectContext());
    } catch (error) {
      return fail(error);
    }
  }
);

defineTool<{ status?: string; limit?: number }>(
  "list_reports",
  "List reports already filed on this project — the raw evidence behind the " +
    "issues, including what the reporter typed and which page they were on.",
  listReportsInput,
  async ({ status, limit }) => {
    try {
      return ok(await client.listReports({ status, limit }));
    } catch (error) {
      return fail(error);
    }
  }
);

defineTool<{
  description: string;
  type?: string;
  reporter_name?: string;
  existing_issue?: number;
}>(
  "report_bug",
  "File a bug or request on this project. Creates a real GitHub issue through " +
    "the same pipeline a person's report uses. Call `list_open_issues` FIRST: " +
    "if it is already open, pass its number as `existing_issue` and this is " +
    "added as a comment on that issue instead of opening a duplicate.",
  reportBugInput,
  async ({ description, type, reporter_name, existing_issue }) => {
    try {
      const result = await client.createReport({
        description,
        type,
        // Never a human's name unless the caller supplies one: a report that
        // looks hand-written but was not is the one thing a maintainer cannot
        // recover from by reading it.
        reporterName: reporter_name ?? "Coding agent (MCP)",
        reporterPrimaryKey: "mcp-agent",
        duplicateIssueNumber: existing_issue,
      });
      return ok(result);
    } catch (error) {
      return fail(error);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
