import Anthropic from "@anthropic-ai/sdk";
import type { AiAction, AiInput, ClarifyQuestion } from "@/lib/ai-types";
import { getClaude, hasClaudeKey } from "./client";
import { SYSTEM_PROMPT } from "./prompt";
import {
  EMIT_TOOL_NAMES,
  EMIT_TOOL_SCHEMAS,
  TOOL_SCHEMAS,
  actionFromEmitTool,
  runTool,
} from "./tools";
import type { EnrichmentMetrics, ToolContext } from "./types";

const MODEL = "claude-haiku-4-5";
const MAX_TURNS = 6;
const HARD_TIMEOUT_MS = 15_000;
const MAX_OUTPUT_TOKENS = 4096;

export interface EnrichInput extends AiInput {
  accessToken: string;
  owner: string;
  repo: string;
}

export interface EnrichResult {
  action: AiAction;
  metrics: EnrichmentMetrics;
}

export async function enrich(input: EnrichInput): Promise<EnrichResult> {
  const started = Date.now();
  const metrics: EnrichmentMetrics = {
    turns: 0,
    tokensIn: 0,
    tokensOut: 0,
    latencyMs: 0,
    cacheHits: 0,
    cacheMisses: 0,
    toolCalls: 0,
    fellBack: false,
  };

  if (!hasClaudeKey()) {
    metrics.fellBack = true;
    metrics.latencyMs = Date.now() - started;
    return { action: fallbackCreate(input), metrics };
  }

  const ctx: ToolContext = {
    accessToken: input.accessToken,
    owner: input.owner,
    repo: input.repo,
  };

  const client = getClaude();
  const messages: Anthropic.MessageParam[] = buildInitialMessages(input);

  try {
    const deadline = started + HARD_TIMEOUT_MS;
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      metrics.turns = turn + 1;

      if (Date.now() > deadline) throw new EnrichTimeoutError();

      // On the last turn, withhold exploration tools. Only emit tools remain,
      // so the model is forced to terminate with a structured action.
      const isLastTurn = turn >= MAX_TURNS - 1;
      const systemBlocks: Anthropic.TextBlockParam[] = [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ];
      if (isLastTurn) {
        systemBlocks.push({
          type: "text",
          text: "FINAL TURN: exploration tools are unavailable. Call one of the emit tools (create_issue, update_issue, close_issues, merge_issues, clarify, emit_chat) now — that is the only way to finalize.",
        });
      }

      const availableTools = isLastTurn
        ? EMIT_TOOL_SCHEMAS
        : [...TOOL_SCHEMAS, ...EMIT_TOOL_SCHEMAS];

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: systemBlocks,
        tools: availableTools,
        messages,
      });

      metrics.tokensIn += response.usage.input_tokens;
      metrics.tokensOut += response.usage.output_tokens;

      // Look for an emit-tool call first — that's the structured terminal path.
      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );
      const emitUse = toolUses.find((u) => EMIT_TOOL_NAMES.has(u.name));
      if (emitUse) {
        const action = actionFromEmitTool(emitUse.name, emitUse.input);
        if (action) {
          metrics.latencyMs = Date.now() - started;
          return { action, metrics };
        }
        // Emit tool called with invalid shape (rare — schema-validated) — fall back.
        break;
      }

      if (response.stop_reason === "end_turn" || response.stop_reason === "max_tokens") {
        // Legacy path: model ended without calling an emit tool. Try the
        // text-JSON parser as a safety net for older prompt behavior.
        const action = parseAction(response.content);
        if (action) {
          metrics.latencyMs = Date.now() - started;
          return { action, metrics };
        }
        break;
      }

      if (response.stop_reason !== "tool_use") {
        break;
      }

      if (toolUses.length === 0) break;

      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const use of toolUses) {
        if (Date.now() > deadline) throw new EnrichTimeoutError();
        metrics.toolCalls += 1;
        const result = await runTool(use.name, use.input, ctx);
        if (result.cacheHit) metrics.cacheHits += 1;
        else metrics.cacheMisses += 1;
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: result.content,
          is_error: result.isError,
        });
      }
      messages.push({ role: "user", content: toolResults });
    }

    // Exhausted turns or unparseable output — fall back.
    metrics.fellBack = true;
    metrics.latencyMs = Date.now() - started;
    console.warn("[claude-enricher] exhausted turns or unparseable output, using fallback", {
      owner: input.owner,
      repo: input.repo,
      metrics,
    });
    return { action: fallbackCreate(input), metrics };
  } catch (err) {
    metrics.fellBack = true;
    metrics.latencyMs = Date.now() - started;
    const isTimeout = err instanceof EnrichTimeoutError;
    const isApiError = err instanceof Anthropic.APIError;
    console.error("[claude-enricher] error — falling back", {
      owner: input.owner,
      repo: input.repo,
      kind: isTimeout ? "timeout" : isApiError ? `api:${err.status}` : "unknown",
      message: err instanceof Error ? err.message : String(err),
      metrics,
    });
    return { action: fallbackCreate(input), metrics };
  }
}

// ─── Input build ────────────────────────────────────────

function buildInitialMessages(input: EnrichInput): Anthropic.MessageParam[] {
  const parts: string[] = [];
  parts.push(`Repository: ${input.owner}/${input.repo}`);
  if (input.repoDescription) {
    parts.push(`\nRepo description:\n${input.repoDescription}`);
  }
  if (input.repoReadme) {
    parts.push(`\nRepo README (truncated):\n${input.repoReadme}`);
  }

  if (input.openIssues && input.openIssues.length > 0) {
    parts.push(
      "\nRecent issues in this repo (consider updating these instead of creating new ones):",
    );
    for (const issue of input.openIssues) {
      parts.push(`- #${issue.number} [${issue.state}]: ${issue.title}`);
      if (issue.body) parts.push(`  Body: ${issue.body}`);
    }
  } else {
    parts.push("\nNo issues in this repo yet.");
  }

  parts.push(`\n---\nUser report:\n${input.description || "(empty)"}`);
  if (input.errorStack) parts.push(`\nError stack:\n${input.errorStack}`);
  if (input.pageUrl) parts.push(`\nPage URL: ${input.pageUrl}`);
  if (input.userAgent) parts.push(`\nUser agent: ${input.userAgent}`);

  const userContent: Anthropic.ContentBlockParam[] = [
    { type: "text", text: parts.join("\n") },
  ];

  if (input.screenshotUrl && input.screenshotUrl.startsWith("http")) {
    userContent.push({
      type: "image",
      source: { type: "url", url: input.screenshotUrl },
    });
  } else if (input.screenshotUrl && input.screenshotUrl.startsWith("data:image/")) {
    const match = input.screenshotUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (match) {
      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: match[1] as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
          data: match[2],
        },
      });
    }
  }

  const messages: Anthropic.MessageParam[] = [];

  if (input.chatHistory && input.chatHistory.length > 0) {
    const recent = input.chatHistory.slice(-5);
    for (const msg of recent) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: "user", content: userContent });
  return messages;
}

// ─── Action parsing ─────────────────────────────────────

function parseAction(content: Anthropic.ContentBlock[]): AiAction | null {
  const text = content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!text) return null;

  const jsonText = extractJson(text);
  if (!jsonText) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    return null;
  }

  const intent = String(parsed.intent ?? "");

  if (intent === "create") {
    return {
      intent: "create",
      title: String(parsed.title ?? "Bug report").slice(0, 80),
      body: String(parsed.body ?? ""),
      labels: Array.isArray(parsed.labels) ? parsed.labels.map(String) : ["bug"],
      severity: String(parsed.severity ?? "medium"),
    };
  }
  if (intent === "update") {
    return {
      intent: "update",
      issueNumber: Number(parsed.issueNumber),
      comment: String(parsed.comment ?? ""),
    };
  }
  if (intent === "close") {
    const nums = Array.isArray(parsed.issueNumbers) ? parsed.issueNumbers.map(Number) : [];
    return {
      intent: "close",
      issueNumbers: nums,
      comment: String(parsed.comment ?? "Closed via Glitchgrab"),
    };
  }
  if (intent === "merge") {
    const closeNums = Array.isArray(parsed.closeIssues)
      ? parsed.closeIssues.map(Number)
      : [];
    return {
      intent: "merge",
      keepIssue: Number(parsed.keepIssue),
      closeIssues: closeNums,
      mergedTitle: String(parsed.mergedTitle ?? ""),
      mergedBody: String(parsed.mergedBody ?? ""),
    };
  }
  if (intent === "clarify") {
    const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
    const questions: ClarifyQuestion[] = rawQuestions
      .map((q: unknown): ClarifyQuestion | null => {
        if (!q || typeof q !== "object") return null;
        const obj = q as Record<string, unknown>;
        const question = String(obj.question ?? "");
        if (!question) return null;
        const options = Array.isArray(obj.options)
          ? obj.options.map(String).slice(0, 4)
          : [];
        return { question, options };
      })
      .filter((q): q is ClarifyQuestion => q !== null)
      .slice(0, 1);
    if (questions.length === 0) return null;
    return { intent: "clarify", questions };
  }
  if (intent === "chat") {
    return {
      intent: "chat",
      message: String(parsed.message ?? "I'm not sure how to help with that."),
    };
  }
  return null;
}

function extractJson(text: string): string | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

// ─── Fallback ───────────────────────────────────────────

class EnrichTimeoutError extends Error {
  constructor() {
    super("enrichment exceeded hard timeout");
    this.name = "EnrichTimeoutError";
  }
}

function fallbackCreate(input: EnrichInput): AiAction {
  const desc = (input.description ?? "").trim() || "Bug report";
  return {
    intent: "create",
    title: desc.slice(0, 80),
    body: `## Description\n\n${desc || "No description provided."}\n\n## Additional Context\n\nAI enrichment was unavailable for this report — this issue was created directly from the user's input. A human may want to scope this further.`,
    labels: ["bug"],
    severity: "medium",
  };
}
