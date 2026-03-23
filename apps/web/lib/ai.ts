import OpenAI from "openai";

// ─── Types ──────────────────────────────────────────────

export interface AiIssueInput {
  description: string;
  screenshotUrl?: string | null;
  errorStack?: string | null;
  pageUrl?: string | null;
  userAgent?: string | null;
}

export interface AiIssueOutput {
  title: string;
  body: string;
  labels: string[];
  severity: "critical" | "high" | "medium" | "low";
}

// ─── System prompt ──────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior software engineer who writes clear, actionable GitHub issues.

Given a bug report (description, optional screenshot, optional error stack), generate a structured GitHub issue.

Respond ONLY with valid JSON matching this schema — no markdown fences, no extra text:
{
  "title": "string (concise, under 80 chars, imperative mood e.g. 'Fix crash when...')",
  "body": "string (GitHub-flavored markdown with sections: ## Description, ## Steps to Reproduce, ## Expected Behavior, ## Actual Behavior, ## Additional Context)",
  "labels": ["array of relevant labels like 'bug', 'high-priority', 'ui', 'crash', 'performance', 'regression', 'accessibility'"],
  "severity": "one of: critical | high | medium | low"
}

Severity guidelines:
- critical: app crash, data loss, security vulnerability
- high: major feature broken, blocks user workflow
- medium: feature partially broken, workaround exists
- low: cosmetic issue, minor inconvenience

Write the body in professional, third-person technical style. Include reproduction steps even if you have to infer them from context. If an error stack is provided, include it in a code block under Additional Context.`;

// ─── AI Service ─────────────────────────────────────────

export async function generateIssueFromBug(
  input: AiIssueInput
): Promise<AiIssueOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const openai = new OpenAI({ apiKey });

  // Build the user message content
  const userParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

  // Text content
  let textContent = `Bug Report:\n${input.description}`;
  if (input.errorStack) {
    textContent += `\n\nError Stack:\n${input.errorStack}`;
  }
  if (input.pageUrl) {
    textContent += `\n\nPage URL: ${input.pageUrl}`;
  }
  if (input.userAgent) {
    textContent += `\n\nUser Agent: ${input.userAgent}`;
  }
  userParts.push({ type: "text", text: textContent });

  // Screenshot (if provided, send as image URL for GPT-4o vision)
  if (input.screenshotUrl) {
    userParts.push({
      type: "image_url",
      image_url: { url: input.screenshotUrl, detail: "auto" },
    });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userParts },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  const rawContent = response.choices[0]?.message?.content;
  if (!rawContent) {
    throw new Error("AI returned empty response");
  }

  // Parse — strip markdown code fences if the model wraps them anyway
  const cleaned = rawContent
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed: unknown = JSON.parse(cleaned);

  // Validate shape
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("title" in parsed) ||
    !("body" in parsed) ||
    !("labels" in parsed) ||
    !("severity" in parsed)
  ) {
    throw new Error("AI response missing required fields");
  }

  const result = parsed as Record<string, unknown>;

  const validSeverities = ["critical", "high", "medium", "low"] as const;
  const severity = validSeverities.includes(
    result.severity as (typeof validSeverities)[number]
  )
    ? (result.severity as AiIssueOutput["severity"])
    : "medium";

  return {
    title: String(result.title).slice(0, 80),
    body: String(result.body),
    labels: Array.isArray(result.labels)
      ? result.labels.map((l) => String(l))
      : ["bug"],
    severity,
  };
}
