import OpenAI from "openai";

// ─── Types ──────────────────────────────────────────────

export interface AiInput {
  description: string;
  screenshotUrl?: string | null;
  errorStack?: string | null;
  pageUrl?: string | null;
  userAgent?: string | null;
  openIssues?: { number: number; title: string; state: string }[];
}

export type AiAction =
  | { intent: "create"; title: string; body: string; labels: string[]; severity: string }
  | { intent: "update"; issueNumber: number; comment: string }
  | { intent: "close"; issueNumbers: number[]; comment: string }
  | { intent: "merge"; keepIssue: number; closeIssues: number[]; mergedTitle: string; mergedBody: string }
  | { intent: "chat"; message: string };

// ─── System prompt ──────────────────────────────────────

const SYSTEM_PROMPT = `You are a smart GitHub issue assistant. You help developers manage bugs and issues through conversation.

Given user input (text, optional screenshot, optional error stack) and a list of recent issues in the repo, decide what to do:

1. **CREATE** a new issue — ONLY if the bug is completely new and doesn't relate to any existing issue
2. **UPDATE** an existing issue — if the bug is similar, related, or in the same area as an existing open issue. Group related problems together.
3. **CLOSE** issues — if the user asks to close specific issues or all issues
4. **MERGE** — if there are multiple small related issues that should be one. Combine them into one comprehensive issue, close the rest.
5. **CHAT** — if the input is vague, unclear, a question, or needs clarification before taking action

IMPORTANT:
- Respond ONLY with valid JSON. Pick ONE action.
- If the user's description is vague or unclear, use CHAT to ask for clarification before creating/updating.
- If a screenshot is provided, describe what you see and ask if that's the bug they mean.
- Prefer UPDATE over CREATE — developers want fewer comprehensive issues, not many small ones.
- Small related issues (UI, styling, icons, layout, responsiveness) should be ONE issue.
- If user says "too many issues", "combine these", "merge", or similar — look at open issues and MERGE related ones.
- Proactively suggest merging if you see 2+ open issues that could be one.

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

For MERGE (combine related issues into one):
{
  "intent": "merge",
  "keepIssue": 11,
  "closeIssues": [12, 13],
  "mergedTitle": "string (new combined title)",
  "mergedBody": "string (combined body with all relevant info from merged issues)"
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
- If an open issue covers the same AREA (e.g., UI, mobile, icons, layout, responsiveness), choose UPDATE
- Small related UI issues (icons broken + layout not responsive + styling off) should be ONE issue, not separate
- Only CREATE a new issue if the bug is in a completely different feature/area
- When in doubt, UPDATE an existing related issue rather than creating a new one
- Think like a developer: would fixing issue X also fix this new report? If yes, UPDATE

IMPORTANT: Prefer UPDATE over CREATE. Developers prefer fewer, comprehensive issues over many small ones. Group related problems together.

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
    textContent += "\n\nRecent issues in this repo (consider updating these instead of creating new ones):";
    for (const issue of input.openIssues) {
      textContent += `\n- #${issue.number} [${issue.state}]: ${issue.title}`;
    }
  } else {
    textContent += "\n\nNo issues in this repo yet.";
  }

  userParts.push({ type: "text", text: textContent });

  if (input.screenshotUrl) {
    userParts.push({
      type: "image_url",
      image_url: { url: input.screenshotUrl, detail: "auto" },
    });
  }

  // Use gpt-4o for screenshots (better vision), gpt-4o-mini for text-only
  const model = input.screenshotUrl ? "gpt-4o" : "gpt-4o-mini";
  console.info(`[AI] Calling ${model} with`, userParts.length, "parts");

  const response = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userParts },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  console.info("[AI] Response received, finish_reason:", response.choices[0]?.finish_reason);

  const rawContent = response.choices[0]?.message?.content;
  if (!rawContent) {
    console.error("[AI] Empty response from OpenAI");
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

  return {
    intent: "chat",
    message: String(parsed.message ?? "I'm not sure what to do with that."),
  };
}
