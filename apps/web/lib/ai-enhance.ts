import { GoogleGenerativeAI } from "@google/generative-ai";

const ENHANCE_SYSTEM_PROMPT = `You polish bug-report text. When a screenshot is provided, use it only to clarify what the user already described — do not invent new issues or add facts not visible in the screenshot or text.

Rules:
- Fix grammar, spelling, and clarity only.
- Keep the user's voice and meaning intact.
- Preserve all technical terms, code, errors, URLs, and identifiers exactly.
- If the input is already clean, return it unchanged.
- Never add headings, bullet lists, or formatting the user didn't write.
- Return ONLY the polished text — no commentary, no markdown fences, no preface.`;

const MAX_INPUT_CHARS = 5000;
const MAX_OUTPUT_TOKENS = 1024;

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

export async function enhanceText(input: string, screenshotDataUrl?: string | null): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed.length > MAX_INPUT_CHARS) {
    throw new Error(`Text too long — max ${MAX_INPUT_CHARS} characters`);
  }

  const model = getGemini();

  type Part = string | { inlineData: { data: string; mimeType: string } };
  const parts: Part[] = [];

  if (screenshotDataUrl) {
    const match = screenshotDataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
    if (match) {
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
  }
  parts.push(trimmed);

  const result = await model.generateContent(parts);
  const text = result.response.text().trim();
  if (!text) throw new Error("AI returned no text");
  return text;
}
