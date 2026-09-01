import { geminiVisionChat, geminiChat } from "@/lib/gemini/client";
import { deepseekChat } from "@/lib/deepseek/client";
import { getFrameBase64 } from "@/lib/recordings";
import {
  buildExtractPrompt,
  EXTRACT_SYSTEM_PROMPT,
  MAX_DRAFTS,
  MAX_FRAMES,
  normaliseDraft,
  parseJsonReply,
  type DraftIssue,
} from "./prompt";

/**
 * Read a call and come back with draft issues.
 *
 * Vision first, because half of what a client "reports" on a call is pointed at
 * rather than described — "this button here", "see, it says that". Without the
 * frames those become unfileable drafts. gemini-2.5-pro is the same generator
 * the narration pipeline settled on, and deepseek stays as the reliability
 * fallback exactly as it does there (see capture-sessions/[id]/route.ts) — but
 * the fallback is TEXT ONLY, so a run that falls back loses the screenshots and
 * says so rather than silently producing thinner drafts.
 */

export interface FrameRef {
  id: string;
  tMs: number;
  key: string;
}

export interface ExtractResult {
  drafts: DraftIssue[];
  /** Which model actually answered. Surfaced so a thin result is explainable. */
  model: string;
  /** Frames actually sent. Empty on the text-only fallback path. */
  framesUsed: FrameRef[];
}

/**
 * Spread the picks across the call instead of taking the first N.
 *
 * The first sixteen frames of an hour-long call are all the first three
 * minutes — which is the part where everyone is saying hello.
 */
export function pickFrames(frames: FrameRef[], limit = MAX_FRAMES): FrameRef[] {
  if (frames.length <= limit) return frames;
  const step = (frames.length - 1) / (limit - 1);
  const picked: FrameRef[] = [];
  for (let i = 0; i < limit; i++) picked.push(frames[Math.round(i * step)]);
  return picked;
}

export async function extractIssues(params: {
  repoFullName: string;
  title: string | null;
  transcript: string;
  frames: FrameRef[];
  openIssueTitles: string[];
}): Promise<ExtractResult> {
  const picked = pickFrames(params.frames);

  // A frame that fails to load is not worth failing the extraction over — the
  // transcript is the substance, the frames are corroboration.
  const loaded = (
    await Promise.all(
      picked.map(async (f) => {
        try {
          return { frame: f, data: await getFrameBase64(f.key) };
        } catch {
          return null;
        }
      })
    )
  ).filter((x): x is { frame: FrameRef; data: string } => x !== null);

  const text = buildExtractPrompt({
    repoFullName: params.repoFullName,
    title: params.title,
    transcript: params.transcript,
    frames: loaded.map(({ frame }) => ({ id: frame.id, tMs: frame.tMs })),
    openIssueTitles: params.openIssueTitles,
  });

  let raw = "";
  let model = "gemini-2.5-pro-vision";

  try {
    raw = loaded.length
      ? await geminiVisionChat({
          system: EXTRACT_SYSTEM_PROMPT,
          text,
          images: loaded.map(({ data }) => ({ data, mimeType: "image/jpeg" })),
          maxTokens: 8192,
          temperature: 0.3,
        })
      : ((model = "gemini-2.5-pro"),
        await geminiChat({
          model: "gemini-2.5-pro",
          messages: [
            { role: "system", content: EXTRACT_SYSTEM_PROMPT },
            { role: "user", content: text },
          ],
          maxTokens: 8192,
          temperature: 0.3,
        }));
  } catch (err) {
    console.error("[meeting-issues] gemini failed, falling back:", err);
    model = "deepseek-v4-flash";
    raw = await deepseekChat({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: EXTRACT_SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      maxTokens: 8192,
      temperature: 0.3,
    });
  }

  const parsed = parseJsonReply<{ issues?: unknown[] }>(raw);
  const drafts = (parsed?.issues ?? [])
    .map(normaliseDraft)
    .filter((d): d is DraftIssue => d !== null)
    .slice(0, MAX_DRAFTS);

  // The model is told to cite a frame by id. Anything else it names is a
  // hallucinated id, and a draft pointing at a frame that does not exist is a
  // broken thumbnail in the panel.
  const validIds = new Set(loaded.map(({ frame }) => frame.id));
  for (const d of drafts) d.frames = d.frames.filter((id) => validIds.has(id));

  return {
    drafts,
    model,
    framesUsed: model === "deepseek-v4-flash" ? [] : loaded.map(({ frame }) => frame),
  };
}
