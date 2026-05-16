import { getClaude } from "@/lib/claude/client";

const ENHANCE_SYSTEM_PROMPT = `You polish bug-report text. You DO NOT add new facts, invent details, infer severity, generate labels, or speculate about causes.

Rules:
- Fix grammar, spelling, and clarity only.
- Keep the user's voice and meaning intact.
- Preserve all technical terms, code, errors, URLs, and identifiers exactly.
- If the input is already clean, return it unchanged.
- Never add headings, bullet lists, or formatting the user didn't write.
- Return ONLY the polished text — no commentary, no markdown fences, no preface.`;

const MAX_INPUT_CHARS = 5000;
const MAX_OUTPUT_TOKENS = 1024;

export async function enhanceText(input: string): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed.length > MAX_INPUT_CHARS) {
    throw new Error(`Text too long — max ${MAX_INPUT_CHARS} characters`);
  }

  const claude = getClaude();
  const response = await claude.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: MAX_OUTPUT_TOKENS,
    system: ENHANCE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: trimmed }],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("AI returned no text");
  }
  return block.text.trim();
}
