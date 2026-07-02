// Gemini chat client for narration script generation. Same {role, content}
// message shape as deepseekChat so the routes stay drop-in. system messages map
// to systemInstruction; user/assistant map to Gemini's user/model contents.
//
// gemini-2.5-pro is the chosen narration generator: it obeys the Sarvam TTS
// rules (no "₹", no hyphens) and the word budget better than deepseek-v4-pro,
// in ~20s vs 40–60s. Routes still keep deepseek-v4-flash as a reliability
// fallback (see capture-sessions/[id]/route.ts).

import { GoogleGenerativeAI } from "@google/generative-ai";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatParams {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  // gemini-2.5-pro: strongest, best at the literal format/Devanagari rules.
  // gemini-2.5-flash: faster/cheaper fallback if needed.
  model?: "gemini-2.5-pro" | "gemini-2.5-flash";
}

/**
 * Call Gemini and return the assistant text. Concatenates all system messages
 * into systemInstruction; user/assistant turns become the contents history.
 * Retries 3x with exponential backoff on transient (5xx / network) failures.
 */
export async function geminiChat(params: ChatParams): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not configured");

  const model = params.model ?? "gemini-2.5-pro";

  const systemInstruction = params.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  // user → "user", assistant → "model". Gemini rejects an empty contents array,
  // so this must hold at least one turn (the routes always pass a user message).
  const contents = params.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));

  const genAI = new GoogleGenerativeAI(apiKey);
  const gm = genAI.getGenerativeModel({
    model,
    ...(systemInstruction ? { systemInstruction } : {}),
    generationConfig: {
      // Pro is a thinking model — give big headroom so the spoken answer lands in
      // the output instead of being truncated by thinking-token spend.
      maxOutputTokens: params.maxTokens ?? 8192,
      temperature: params.temperature ?? 0.7,
    },
  });

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await gm.generateContent({ contents });
      const text = result.response.text().trim();
      if (!text) throw new Error("Gemini returned no text");
      return text;
    } catch (err) {
      lastError = err;
      // Retry transient errors (5xx / 429 / network); fail fast on 4xx auth/quota
      // that won't recover (limit:0 free-tier, bad key).
      const msg = err instanceof Error ? err.message : String(err);
      const transient = /50\d|429|fetch|network|ECONN|timeout/i.test(msg);
      if (!transient || attempt === 2) {
        if (attempt === 2) break;
        throw err;
      }
      await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini call failed");
}

// ── Vision variant ───────────────────────────────────────────────────────────
// Same retry/model contract as geminiChat, but the single user turn carries
// IMAGE parts (inlineData) alongside the text. Used by the note-questions route's
// second pass: the model SEES a screenshot of each ambiguous element and decides
// whether it can now narrate it confidently (so it stops asking the user).

interface VisionImage {
  /** Raw base64 (NO "data:image/...;base64," prefix). */
  data: string;
  /** e.g. "image/jpeg". */
  mimeType: string;
}

interface VisionParams {
  system?: string;
  /** The text prompt that accompanies the images in the one user turn. */
  text: string;
  images: VisionImage[];
  maxTokens?: number;
  temperature?: number;
  model?: "gemini-2.5-pro" | "gemini-2.5-flash";
}

/**
 * Call Gemini with a vision payload (text + N images) and return the answer.
 * The images and text are sent as a single user turn so the model can correlate
 * each picture with the part of the prompt that references it. Retries 3x on
 * transient failures, identical to geminiChat.
 */
export async function geminiVisionChat(params: VisionParams): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not configured");

  const model = params.model ?? "gemini-2.5-pro";
  const genAI = new GoogleGenerativeAI(apiKey);
  const gm = genAI.getGenerativeModel({
    model,
    ...(params.system ? { systemInstruction: params.system } : {}),
    generationConfig: {
      maxOutputTokens: params.maxTokens ?? 8192,
      temperature: params.temperature ?? 0.4,
    },
  });

  const parts = [
    ...params.images.map((img) => ({
      inlineData: { data: img.data, mimeType: img.mimeType },
    })),
    { text: params.text },
  ];

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await gm.generateContent({
        contents: [{ role: "user", parts }],
      });
      const text = result.response.text().trim();
      if (!text) throw new Error("Gemini returned no text");
      return text;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const transient = /50\d|429|fetch|network|ECONN|timeout/i.test(msg);
      if (!transient || attempt === 2) {
        if (attempt === 2) break;
        throw err;
      }
      await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini call failed");
}
