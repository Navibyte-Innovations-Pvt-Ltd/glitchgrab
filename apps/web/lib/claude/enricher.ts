import Anthropic from "@anthropic-ai/sdk";
import type { AiAction, AiInput } from "@/lib/ai-types";
import { getClaude, hasClaudeKey } from "./client";
import type { EnrichmentMetrics } from "./types";

const MODEL = "claude-haiku-4-5";
const MAX_OUTPUT_TOKENS = 1024;

const SYSTEM = `You are a bug-triage assistant. Turn the user's report into a GitHub issue.

Respond with ONLY valid JSON (no markdown fences, no extra prose):
{
  "title": "concise issue title (max 80 chars)",
  "body": "well-structured markdown issue body with ## Description, ## Steps to Reproduce (if applicable), ## Expected Behavior and ## Actual Behavior sections",
  "labels": ["bug"],
  "severity": "low | medium | high | critical"
}

Severity guide:
- critical: app crash, data loss, security issue
- high: major feature broken, blocks user workflow
- medium: feature partially broken, workaround exists
- low: cosmetic, minor inconvenience`;

interface EnrichInput extends AiInput {
  accessToken: string;
  owner: string;
  repo: string;
}

interface EnrichResult {
  action: AiAction;
  metrics: EnrichmentMetrics;
}

export async function enrich(input: EnrichInput): Promise<EnrichResult> {
  const started = Date.now();
  const metrics: EnrichmentMetrics = {
    turns: 1,
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

  const client = getClaude();
  const userContent = buildUserContent(input);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM,
      messages: [{ role: "user", content: userContent }],
    });

    metrics.tokensIn = response.usage.input_tokens;
    metrics.tokensOut = response.usage.output_tokens;
    metrics.latencyMs = Date.now() - started;

    const action = parseCreateAction(response.content);
    if (action) return { action, metrics };

    metrics.fellBack = true;
    console.warn("[claude-enricher] could not parse response, using fallback", {
      owner: input.owner,
      repo: input.repo,
    });
    return { action: fallbackCreate(input), metrics };
  } catch (err) {
    metrics.fellBack = true;
    metrics.latencyMs = Date.now() - started;
    console.error("[claude-enricher] error — falling back", {
      owner: input.owner,
      repo: input.repo,
      kind: err instanceof Anthropic.APIError ? `api:${err.status}` : "unknown",
      message: err instanceof Error ? err.message : String(err),
    });
    return { action: fallbackCreate(input), metrics };
  }
}

// ─── Input build ────────────────────────────────────────

function buildUserContent(input: EnrichInput): Anthropic.ContentBlockParam[] {
  const parts: string[] = [];

  parts.push(input.description || "(no description provided)");
  if (input.errorStack) parts.push(`\nError stack:\n${input.errorStack}`);
  if (input.pageUrl) parts.push(`\nPage URL: ${input.pageUrl}`);
  if (input.userAgent) parts.push(`\nUser agent: ${input.userAgent}`);

  const content: Anthropic.ContentBlockParam[] = [
    { type: "text", text: parts.join("\n") },
  ];

  if (input.screenshotUrl && input.screenshotUrl.startsWith("http")) {
    content.push({
      type: "image",
      source: { type: "url", url: input.screenshotUrl },
    });
  } else if (input.screenshotUrl && input.screenshotUrl.startsWith("data:image/")) {
    const match = input.screenshotUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (match) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: match[1] as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
          data: match[2],
        },
      });
    }
  }

  return content;
}

// ─── Response parsing ────────────────────────────────────

function parseCreateAction(blocks: Anthropic.ContentBlock[]): AiAction | null {
  const text = blocks
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

  const title = String(parsed.title ?? "").slice(0, 80) || "Bug report";
  const body = String(parsed.body ?? "");
  const labels = Array.isArray(parsed.labels) ? parsed.labels.map(String) : ["bug"];
  const severity = String(parsed.severity ?? "medium");

  if (!body) return null;

  return { intent: "create", title, body, labels, severity };
}

function extractJson(text: string): string | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

// ─── Fallback ────────────────────────────────────────────

function fallbackCreate(input: EnrichInput): AiAction {
  const desc = (input.description ?? "").trim() || "Bug report";
  return {
    intent: "create",
    title: desc.slice(0, 80),
    body: `## Description\n\n${desc || "No description provided."}\n\n## Additional Context\n\nAI enrichment was unavailable for this report — this issue was created directly from the user's input.`,
    labels: ["bug"],
    severity: "medium",
  };
}
