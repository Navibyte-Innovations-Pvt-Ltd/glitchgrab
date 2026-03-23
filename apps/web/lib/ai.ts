import OpenAI from "openai";

// ─── Types ──────────────────────────────────────────────

export interface AiInput {
  description: string;
  screenshotUrl?: string | null;
  errorStack?: string | null;
  pageUrl?: string | null;
  userAgent?: string | null;
  openIssues?: { number: number; title: string }[];
}

export type AiAction =
  | { intent: "create"; title: string; body: string; labels: string[]; severity: string }
  | { intent: "update"; issueNumber: number; comment: string }
  | { intent: "close"; issueNumbers: number[]; comment: string }
  | { intent: "chat"; message: string };

// ─── System prompt ──────────────────────────────────────

const SYSTEM_PROMPT = `You are a smart GitHub issue assistant. You help developers manage bugs and issues.

Given user input (text, optional screenshot, optional error stack) and a list of OPEN issues in the repo, decide what to do:

1. **CREATE** a new issue — if the bug is new and doesn't match any open issue
2. **UPDATE** an existing issue — if the bug is similar/related to an open issue (add a comment instead of creating a duplicate)
3. **CLOSE** issues — if the user asks to close specific issues or all issues
4. **CHAT** — if the user is asking a question or the input isn't actionable

IMPORTANT: Respond ONLY with valid JSON. Pick ONE action:

For CREATE:
{
  "intent": "create",
  "title": "string (concise, under 80 chars)",
  "body": "string (GitHub markdown with ## Description, ## Steps to Reproduce, ## Expected Behavior, ## Actual Behavior, ## Additional Context)",
  "labels": ["bug", "ui", etc],
  "severity": "critical | high | medium | low"
}

For UPDATE (similar bug to existing issue):
{
  "intent": "update",
  "issueNumber": 42,
  "comment": "string (additional context to add as a comment on the existing issue)"
}

For CLOSE:
{
  "intent": "close",
  "issueNumbers": [1, 2, 3],
  "comment": "string (reason for closing)"
}

For CHAT (non-actionable input):
{
  "intent": "chat",
  "message": "string (helpful response to the user)"
}

Severity guidelines:
- critical: app crash, data loss, security vulnerability
- high: major feature broken, blocks user workflow
- medium: feature partially broken, workaround exists
- low: cosmetic issue, minor inconvenience

When deciding CREATE vs UPDATE:
- If an open issue has a very similar title/topic, choose UPDATE
- If it's clearly a different bug, choose CREATE
- When in doubt, CREATE a new issue

ALWAYS respond with valid JSON. Never refuse.`;

// ─── AI Service ─────────────────────────────────────────

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey });
}

export async function classifyAndGenerate(input: AiInput): Promise<AiAction> {
  const openai = getOpenAI();

  const userParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

  let textContent = `User input:\n${input.description}`;
  if (input.errorStack) {
    textContent += `\n\nError Stack:\n${input.errorStack}`;
  }
  if (input.pageUrl) {
    textContent += `\n\nPage URL: ${input.pageUrl}`;
  }
  if (input.userAgent) {
    textContent += `\n\nUser Agent: ${input.userAgent}`;
  }

  if (input.openIssues && input.openIssues.length > 0) {
    textContent += "\n\nCurrently OPEN issues in this repo:";
    for (const issue of input.openIssues) {
      textContent += `\n- #${issue.number}: ${issue.title}`;
    }
  } else {
    textContent += "\n\nNo open issues in this repo.";
  }

  userParts.push({ type: "text", text: textContent });

  if (input.screenshotUrl) {
    userParts.push({
      type: "image_url",
      image_url: { url: input.screenshotUrl, detail: "auto" },
    });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userParts },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  const rawContent = response.choices[0]?.message?.content;
  if (!rawContent) {
    // Fallback: create an issue from the description directly
    return {
      intent: "create",
      title: (input.description || "Bug report").slice(0, 80),
      body: `## Description\n\n${input.description || "No description provided."}\n\n## Additional Context\n\nAI analysis was unavailable. This issue was created directly from the user's input.`,
      labels: ["bug"],
      severity: "medium",
    };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawContent) as Record<string, unknown>;
  } catch {
    return { intent: "chat", message: rawContent };
  }

  const intent = parsed.intent as string;

  if (intent === "create") {
    return {
      intent: "create",
      title: String(parsed.title ?? "Bug report").slice(0, 80),
      body: String(parsed.body ?? ""),
      labels: Array.isArray(parsed.labels)
        ? parsed.labels.map((l) => String(l))
        : ["bug"],
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
    const nums = Array.isArray(parsed.issueNumbers)
      ? parsed.issueNumbers.map(Number)
      : [];
    return {
      intent: "close",
      issueNumbers: nums,
      comment: String(parsed.comment ?? "Closed via Glitchgrab"),
    };
  }

  return {
    intent: "chat",
    message: String(parsed.message ?? "I'm not sure what to do with that."),
  };
}
