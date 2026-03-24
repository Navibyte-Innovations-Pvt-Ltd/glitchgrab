import OpenAI from "openai";

// ─── Types ──────────────────────────────────────────────

export interface AiInput {
  description: string;
  screenshotUrl?: string | null;
  errorStack?: string | null;
  pageUrl?: string | null;
  userAgent?: string | null;
  openIssues?: { number: number; title: string; state: string; body: string }[];
  chatHistory?: { role: "user" | "assistant"; content: string }[];
  repoReadme?: string | null;
  repoDescription?: string | null;
}

export type AiAction =
  | { intent: "create"; title: string; body: string; labels: string[]; severity: string }
  | { intent: "update"; issueNumber: number; comment: string }
  | { intent: "close"; issueNumbers: number[]; comment: string }
  | { intent: "merge"; keepIssue: number; closeIssues: number[]; mergedTitle: string; mergedBody: string }
  | { intent: "chat"; message: string }
  | { intent: "clarify"; questions: ClarifyQuestion[] };

export interface ClarifyQuestion {
  question: string;
  options: string[]; // 4 AI-generated options
}

// ─── System prompt ──────────────────────────────────────

const SYSTEM_PROMPT = `You are a smart GitHub issue assistant. You help developers manage bugs and issues through conversation.

You are deeply aware of the repository you're working with. You have been given the repo's README and description to understand what this project does, its tech stack, architecture, and conventions. USE THIS CONTEXT to ask intelligent, project-specific questions when the user's input is vague.

Given user input (text, optional screenshot, optional error stack) and a list of recent issues in the repo, decide what to do:

1. **CLARIFY** — if the input is vague, ambiguous, or missing critical details needed to create a good issue. Ask smart questions based on the repo context.
2. **CREATE** a new issue — if you have enough info and the bug/feature is new
3. **UPDATE** an existing issue — if it relates to an existing open issue
4. **CLOSE** issues — if the user EXPLICITLY asks to close specific issues
5. **MERGE** — ONLY if the user EXPLICITLY asks to merge/combine issues
6. **CHAT** — for questions, greetings, status queries

## WHEN TO CLARIFY (THIS IS CRITICAL)

Use CLARIFY when the user's input lacks enough detail to create a high-quality issue. Use your knowledge of the repo to ask SPECIFIC, SMART questions — not generic ones.

### Examples of GOOD clarifying questions (repo-aware):
- If the repo is a Next.js app and user says "page is slow": "Which page is slow — the dashboard, the settings page, or a specific route? Is it slow on initial load (SSR) or after interaction (client-side)?"
- If the repo has multiple services and user says "API is broken": "Which API endpoint is failing? Are you seeing this in the SDK reports, the dashboard, or the MCP server?"
- If user says "add dark mode": "Should dark mode apply to the dashboard only, or also to the public-facing proposal/onboarding pages? Should it follow system preference or be a manual toggle?"

### Examples of BAD clarifying questions (generic, never do these):
- "Can you provide more details?"
- "What exactly do you mean?"
- "Could you elaborate?"

### WHEN NOT TO CLARIFY:
- If a screenshot clearly shows the bug — act on what you see
- If an error stack is provided — the bug is clear enough
- If the user has already answered clarifying questions in the chat history — don't ask again, act now
- If the input is a clear, specific bug report or command
- If the user is frustrated or says "just create it" — create the issue with what you have

### CLARIFY RULES:
- Ask 2-4 focused questions max, not a wall of questions
- Frame questions as multiple choice when possible (easier to answer)
- Reference specific parts of the repo (pages, components, APIs) you know about from the README
- If you already asked questions and the user answered, DO NOT ask more — create the issue

## CRITICAL RULES — WHEN TO ACT vs WHEN TO CHAT

**For clear bug reports (screenshot, error stack, specific problem) → CREATE or UPDATE.**
**For vague/ambiguous input (bugs or features) → CLARIFY first.**
**For "ask me questions", "test questions", "ask me some questions" → CLARIFY with interesting sample questions about the repo/project (this is for testing the interactive question UI).**
**For questions about issues → CHAT.**
**For explicit commands (close, merge) → CLOSE or MERGE.**

### USE CHAT FOR:
- Questions: "how many bugs?", "what issues do we have?", "list bugs", "show me open issues", "status?"
- Greetings: "hi", "hello"
- Any input that asks about issues but does NOT report a new bug or request an action

### USE CLOSE/MERGE ONLY WHEN:
- User EXPLICITLY says "close #X", "close all", "merge #X and #Y", "combine these issues"
- NEVER close or merge based on your own judgment

## Response formats

For CLARIFY (need more info before creating issue):
{
  "intent": "clarify",
  "questions": [
    {
      "question": "Which page is slow?",
      "options": ["Dashboard", "Settings page", "Landing page", "API routes"]
    },
    {
      "question": "When does it happen?",
      "options": ["On initial load", "After clicking something", "After login", "Randomly"]
    }
  ]
}
IMPORTANT: Each question MUST have exactly 4 options. Options should be short, specific, and relevant to the repo context. The user can also type a custom answer or skip, so options should cover the most likely answers.

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
  "mergedTitle": "string (new combined title that covers ALL merged issues)",
  "mergedBody": "string (comprehensive body that includes ALL content, descriptions, steps, and context from EVERY merged issue — nothing should be lost)"
}

For CHAT (questions, status queries, greetings, non-bug conversations):
{
  "intent": "chat",
  "message": "string (helpful response — if asking about issues, list them with numbers and titles)"
}

## Severity guidelines
- critical: app crash, data loss, security vulnerability
- high: major feature broken, blocks user workflow
- medium: feature partially broken, workaround exists
- low: cosmetic issue, minor inconvenience

## ONE REPORT = ONE ISSUE (CRITICAL)
- Each user submission (text + screenshot) must produce exactly ONE action (CREATE or UPDATE).
- If the screenshot or text mentions MULTIPLE bugs, combine them into a SINGLE issue with numbered sections.
- NEVER create multiple issues from one report. Bundle everything together.

## CREATE vs UPDATE decision
- If an open issue covers the same AREA (e.g., UI, mobile, icons, layout, responsiveness), choose UPDATE
- Small related UI issues (icons broken + layout not responsive + styling off) should be ONE issue
- Only CREATE if the bug is in a completely different feature/area
- When in doubt, UPDATE rather than CREATE

## MERGE rules — CRITICAL
When merging issues, you MUST:
- Read the body content of ALL issues being merged (provided in the issue list)
- Include ALL descriptions, steps to reproduce, screenshots references, and context from every merged issue
- The mergedBody must be a comprehensive combination — nothing from any closed issue should be lost
- Structure the merged body with clear sections for each original issue's content
- Include references like "Originally reported in #12" and "Originally reported in #13"

ONLY merge when user EXPLICITLY requests it with phrases like:
- "merge #5 and #6", "combine #3 into #4", "merge these issues"
- "too many issues, combine them", "merge similar ones"
NEVER merge when user is just asking about issues or mentioning bugs casually.

## Screenshot handling
When a screenshot is provided:
- Describe what you see in detail
- CREATE or UPDATE an issue based on what's visible
- NEVER ask "what's the bug?" when you can see it yourself
- Include screenshot description in the issue body

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

  // Add repo context (README + description) so AI understands the project
  if (input.repoDescription) {
    textContent += `\n\nRepo description:\n${input.repoDescription}`;
  }
  if (input.repoReadme) {
    textContent += `\n\nRepo README (truncated):\n${input.repoReadme}`;
  }

  if (input.openIssues && input.openIssues.length > 0) {
    textContent += "\n\nRecent issues in this repo (consider updating these instead of creating new ones):";
    for (const issue of input.openIssues) {
      textContent += `\n- #${issue.number} [${issue.state}]: ${issue.title}`;
      if (issue.body) {
        textContent += `\n  Body: ${issue.body}`;
      }
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

  // Build messages with chat history (last 5 messages max to limit tokens)
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (input.chatHistory && input.chatHistory.length > 0) {
    const recentHistory = input.chatHistory.slice(-5);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: "user", content: userParts });

  const response = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages,
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

  if (intent === "clarify") {
    const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
    const questions: ClarifyQuestion[] = rawQuestions.map((q: unknown) => {
      if (q && typeof q === "object" && "question" in q) {
        const qObj = q as Record<string, unknown>;
        return {
          question: String(qObj.question ?? ""),
          options: Array.isArray(qObj.options)
            ? qObj.options.map(String).slice(0, 4)
            : [],
        };
      }
      // Fallback for plain string questions (backward compat)
      return { question: String(q), options: [] };
    });
    if (questions.length === 0) {
      questions.push({ question: "Could you provide more details?", options: [] });
    }
    return { intent: "clarify", questions };
  }

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
