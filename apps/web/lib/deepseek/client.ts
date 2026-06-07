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
}

/**
 * Call DeepSeek-V3 and return the assistant text. Retries 3x with exponential
 * backoff on transient (5xx / network) failures.
 */
export async function deepseekChat(params: ChatParams): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured");

  const body = JSON.stringify({
    model: "deepseek-chat",
    messages: params.messages,
    max_tokens: params.maxTokens ?? 2048,
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
