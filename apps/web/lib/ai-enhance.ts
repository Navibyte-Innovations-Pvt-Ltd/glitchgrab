import { getClaude } from "@/lib/claude/client";
import type Anthropic from "@anthropic-ai/sdk";

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

export async function enhanceText(input: string, screenshotDataUrl?: string | null): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed.length > MAX_INPUT_CHARS) {
    throw new Error(`Text too long — max ${MAX_INPUT_CHARS} characters`);
  }

  const claude = getClaude();

  let userContent: Anthropic.MessageParam["content"] = trimmed;
  if (screenshotDataUrl) {
    const match = screenshotDataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
    if (match) {
      const mediaType = match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
      userContent = [
        { type: "image", source: { type: "base64", media_type: mediaType, data: match[2] } },
        { type: "text", text: trimmed },
      ];
    }
  }

  const response = await claude.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: MAX_OUTPUT_TOKENS,
    system: ENHANCE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("AI returned no text");
  }
  return block.text.trim();
}
