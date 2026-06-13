// DeepSeek-V3 (deepseek-chat) — OpenAI-compatible chat API. Used for cheap
// narration script generation. Raw fetch (no SDK) per server-side fetch convention.

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatParams {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  // Current models (deepseek-chat/deepseek-reasoner are deprecated 2026-07-24 →
  // they're the non-thinking/thinking modes of deepseek-v4-flash):
  //  - "deepseek-v4-flash": fast, cheap, non-thinking by default.
  //  - "deepseek-v4-pro": strongest; best at following the script/cluster rules.
  // Non-thinking modes follow literal format rules better than the thinking
  // (reasoner) mode, which tends to "think" and then drop instructions.
  model?: "deepseek-v4-pro" | "deepseek-v4-flash" | "deepseek-chat" | "deepseek-reasoner";
}

/**
 * Call DeepSeek and return the assistant text (the final answer in
 * message.content; reasoning_content from the reasoner is ignored). Retries 3x
 * with exponential backoff on transient (5xx / network) failures.
 */
export async function deepseekChat(params: ChatParams): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured");

  const model = params.model ?? "deepseek-v4-flash";
  // Thinking modes spend tokens reasoning before the answer — give headroom.
  const defaultMaxTokens = model === "deepseek-reasoner" ? 8192 : 2048;
  const body = JSON.stringify({
    model,
    messages: params.messages,
    max_tokens: params.maxTokens ?? defaultMaxTokens,
    temperature: params.temperature ?? 0.7,
    stream: false,
  });

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(DEEPSEEK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body,
      });

      // Retry on server errors; fail fast on client errors (4xx).
      if (!res.ok) {
        if (res.status >= 500) throw new Error(`DeepSeek ${res.status}`);
        const errText = await res.text().catch(() => "");
        throw new Error(`DeepSeek request failed (${res.status}): ${errText}`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("DeepSeek returned no text");
      return text;
    } catch (err) {
      lastError = err;
      // Don't retry deterministic client errors.
      if (err instanceof Error && err.message.includes("request failed")) throw err;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("DeepSeek call failed");
}
