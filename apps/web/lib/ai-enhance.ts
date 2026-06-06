import { GoogleGenerativeAI } from "@google/generative-ai";

const ENHANCE_SYSTEM_PROMPT = `You are a grammar and clarity editor for bug reports submitted by users inside a web app.

Your ONLY job is to fix grammar, spelling, and awkward phrasing. You must NEVER change what the user is referring to.

Rules (strictly follow all):
- Fix grammar, spelling, and clarity only.
- NEVER change UI element names: if the user says "card", keep "card"; if they say "button", keep "button"; if they say "index pages card", keep "index pages card". Exact nouns and UI references are sacred.
- NEVER invent new issues, add facts, or change the meaning of what the user described.
- NEVER add headings, bullet points, markdown, or formatting the user didn't write.
- Keep the user's voice and intent intact — you are polishing language, not rewriting the report.
- If a screenshot is provided, use it only to clarify ambiguous references — never add new observations from it.
- If context (URL, pages, actions) is provided, use it only to understand what the user is referring to — never include it in the output.
- If the text is already clear and grammatically correct, return it unchanged.
- Return ONLY the polished text — no commentary, no explanation, no markdown fences.`;

const MAX_INPUT_CHARS = 5000;
const MAX_OUTPUT_TOKENS = 1024;

interface EnhanceContext {
  url?: string;
  visitedPages?: string[];
  breadcrumbs?: Array<{ type: string; message: string }>;
}

function getGemini() {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_AI_API_KEY is not configured");
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    systemInstruction: ENHANCE_SYSTEM_PROMPT,
    generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
  });
}

export async function enhanceText(
  input: string,
  screenshotDataUrl?: string | null,
  context?: EnhanceContext | null
): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed.length > MAX_INPUT_CHARS) {
    throw new Error(`Text too long — max ${MAX_INPUT_CHARS} characters`);
  }

  const model = getGemini();

  // Build context block — helps AI understand what UI elements the user refers to
  let contextBlock = "";
  if (context) {
    const lines: string[] = [];
    if (context.url) lines.push(`Current page: ${context.url}`);
    if (context.visitedPages?.length) {
      lines.push(`Recent pages visited: ${context.visitedPages.join(" → ")}`);
    }
    if (context.breadcrumbs?.length) {
      lines.push("Recent user actions:");
      context.breadcrumbs.forEach((b) => lines.push(`  - [${b.type}] ${b.message}`));
    }
    if (lines.length > 0) {
      contextBlock = `[Context — use only to understand what the user refers to, never reproduce in output]\n${lines.join("\n")}\n\n`;
    }
  }

  type Part = string | { inlineData: { data: string; mimeType: string } };
  const parts: Part[] = [];

  if (screenshotDataUrl) {
    const match = screenshotDataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
    if (match) {
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
  }

  parts.push(`${contextBlock}Text to polish:\n${trimmed}`);

  const result = await model.generateContent(parts);
  const text = result.response.text().trim();
  if (!text) throw new Error("AI returned no text");
  return text;
}
