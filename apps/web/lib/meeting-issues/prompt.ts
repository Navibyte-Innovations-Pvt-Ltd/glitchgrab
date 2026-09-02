/**
 * Prompts for turning a recorded client call into draft GitHub issues.
 *
 * The whole feature exists because a call is where the work gets decided and a
 * transcript is where that decision goes to die. The model's job is narrow:
 * find the things the call ASKED FOR, and write each one the way the person on
 * the call would recognise it. Not summarise the meeting, not invent a backlog.
 *
 * The single hardest failure mode — and the reason drafts are corrected rather
 * than filed straight — is confident mistranslation: someone says "attendance"
 * meaning a WhatsApp check-in flow, and the model writes an issue about
 * biometric hardware because that is what attendance usually means. The prompt
 * fights it by forcing every draft to carry the lines it was built from, so a
 * wrong draft is traceable to the sentence that caused it in one glance.
 */

/** Frames sent per extraction. Enough to see what was demoed, few enough to
 *  survive one model turn a person is waiting on. */
export const MAX_FRAMES = 16;

/** A very long call still has to fit one turn. ~120k chars ≈ a 3-hour call. */
const MAX_TRANSCRIPT_CHARS = 120_000;

/** Drafts per extraction. More than this out of one call means the model is
 *  splitting hairs, not finding work. */
export const MAX_DRAFTS = 12;

/** Correction turns per draft before the model is clearly not converging. */
export const MAX_CORRECTION_TURNS = 15;

export const EXTRACT_SYSTEM_PROMPT = `You read a recorded client call and pull out the work it asked for, as GitHub issues.

WHAT COUNTS AS AN ISSUE
- A bug someone reported or demonstrated on the call.
- A feature, change or integration someone asked for.
- A decision that requires a code change to honour.
Anything else is not an issue: pricing chat, scheduling, greetings, status updates on work already done, and anything you are only guessing at.

WHAT DOES NOT COUNT
- Something already filed. You are given the repo's open issue titles — if a topic is clearly one of them, skip it and do not restate it.
- Something discussed and explicitly rejected on the call.
- Vague enthusiasm ("we should make it faster someday") with no specific ask.

THE RULE THAT MATTERS MOST
Write what was said, not what you assume it means. Domain words carry local meanings. If the call says "attendance", you do NOT know whether that is a biometric device, a WhatsApp check-in, a web form or a spreadsheet import — and you must not decide. Describe it in the caller's own words, and put your uncertainty in "openQuestions" where a human will see it and correct you. A draft that admits it does not know is useful. A draft that guesses confidently is worse than no draft, because it gets filed.

SCREENSHOTS
You are given frames captured during the call, each labelled with its timestamp. They show what was on screen — usually a shared screen, a demo or the product being discussed. Use them to make a draft concrete: name the actual screen, the actual button, the actual error. Reference a frame only when it genuinely shows the thing the issue is about. Never describe a frame you cannot see clearly.

LANGUAGE
The call may be in English, Hindi, Marathi or a mix. Write every issue in English, but quote the speaker's own words verbatim in "quotes" — including Devanagari — because that is the evidence a human checks you against.

OUTPUT
Return ONLY a JSON object, no prose, no code fence:
{
  "issues": [
    {
      "title": "short imperative title, under 80 chars",
      "summary": "one sentence a human can skim in the panel",
      "body": "GitHub markdown. Sections in this order, omitting any you have nothing real for:\\n## What was asked\\n## Why (from the call)\\n## Acceptance criteria\\n- [ ] ...\\n## Open questions",
      "labels": ["bug" | "feature" | "enhancement" | "question" | ...],
      "quotes": [{ "speaker": "name as given", "text": "verbatim line", "tMs": 0 }],
      "frames": ["frame id you were shown, or omit"],
      "confidence": "high" | "medium" | "low"
    }
  ]
}

Every issue MUST carry at least one quote. If you cannot quote the call for it, it is not in the call — drop it.`;

export const CORRECT_SYSTEM_PROMPT = `You are fixing ONE draft GitHub issue that came out of a recorded call.

A human who was ON that call is telling you what you got wrong. They were there and you were not: when they contradict your reading of the transcript, they are right and you rewrite. Do not defend the draft, do not re-argue from the transcript, and do not explain what you originally thought.

Apply their correction to the whole draft, not just the sentence they mentioned — a wrong premise usually poisoned the title, the acceptance criteria and the open questions too. Keep everything they did NOT correct intact, including the quotes, which are evidence and are never edited.

Return ONLY a JSON object, no prose, no code fence:
{
  "reply": "one short line telling them what you changed",
  "issue": {
    "title": "...",
    "summary": "...",
    "body": "same markdown sections as before",
    "labels": ["..."],
    "openQuestionsResolved": true | false
  }
}`;

export interface DraftIssue {
  title: string;
  summary?: string;
  body: string;
  labels: string[];
  quotes: { speaker?: string; text: string; tMs?: number }[];
  frames: string[];
  confidence?: string;
}

/**
 * Pull the JSON out of a model reply.
 *
 * Both models occasionally wrap the object in a ```json fence despite being
 * told not to, and Gemini sometimes prefixes a sentence. Slicing to the outer
 * braces is what makes those non-events instead of a failed extraction.
 */
export function parseJsonReply<T>(raw: string): T | null {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/** Normalise one model-emitted issue, dropping anything unusable. */
export function normaliseDraft(raw: unknown): DraftIssue | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const title = typeof r.title === "string" ? r.title.trim() : "";
  const body = typeof r.body === "string" ? r.body.trim() : "";
  if (!title || !body) return null;

  const quotes = Array.isArray(r.quotes)
    ? r.quotes
        .map((q) => {
          if (!q || typeof q !== "object") return null;
          const qq = q as Record<string, unknown>;
          const text = typeof qq.text === "string" ? qq.text.trim() : "";
          if (!text) return null;
          return {
            speaker: typeof qq.speaker === "string" ? qq.speaker : undefined,
            text,
            tMs: typeof qq.tMs === "number" ? qq.tMs : undefined,
          };
        })
        .filter((q): q is NonNullable<typeof q> => q !== null)
    : [];

  // No quote, no draft. This is the one invention guard that actually holds:
  // a model that has to cite the call cannot file work the call never asked for.
  if (quotes.length === 0) return null;

  return {
    title: title.slice(0, 120),
    summary: typeof r.summary === "string" ? r.summary.trim().slice(0, 300) : undefined,
    body,
    labels: Array.isArray(r.labels)
      ? r.labels.filter((l): l is string => typeof l === "string").slice(0, 5)
      : [],
    quotes: quotes.slice(0, 8),
    frames: Array.isArray(r.frames)
      ? r.frames.filter((f): f is string => typeof f === "string").slice(0, 4)
      : [],
    confidence: typeof r.confidence === "string" ? r.confidence : undefined,
  };
}

/** The user-turn text that rides with the frames. */
export function buildExtractPrompt(params: {
  repoFullName: string;
  title: string | null;
  transcript: string;
  frames: { id: string; tMs: number }[];
  openIssueTitles: string[];
}): string {
  const transcript =
    params.transcript.length > MAX_TRANSCRIPT_CHARS
      ? `${params.transcript.slice(0, MAX_TRANSCRIPT_CHARS)}\n[transcript truncated]`
      : params.transcript;

  const frameList = params.frames
    .map((f, i) => `image ${i + 1} → id "${f.id}", at ${formatMs(f.tMs)}`)
    .join("\n");

  const open = params.openIssueTitles.length
    ? params.openIssueTitles.map((t) => `- ${t}`).join("\n")
    : "(none)";

  return `PROJECT: ${params.repoFullName}
CALL: ${params.title ?? "Untitled call"}

ALREADY OPEN ON GITHUB — do not file these again:
${open}

SCREENSHOTS, in the order the images were attached:
${frameList || "(none captured)"}

TRANSCRIPT:
${transcript}

Return the JSON object described in your instructions.`;
}

/** The user turn for a correction. */
export function buildCorrectionPrompt(params: {
  draft: { title: string; body: string; labels: string[]; quotes: unknown };
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
  transcript: string;
}): string {
  const history = params.history
    .map((m) => `${m.role === "user" ? "THEM" : "YOU"}: ${m.content}`)
    .join("\n");

  return `CURRENT DRAFT:
${JSON.stringify(params.draft, null, 2)}

${history ? `EARLIER IN THIS CORRECTION:\n${history}\n` : ""}
THE CALL (for reference only — their correction outranks it):
${params.transcript.slice(0, 40_000)}

THEY SAY:
${params.message}

Return the JSON object described in your instructions.`;
}

function formatMs(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
