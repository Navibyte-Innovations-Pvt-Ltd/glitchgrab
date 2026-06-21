// Pure, side-effect-free helpers for the note-questions VISION pass, extracted
// from route.ts so they're unit-testable without mocking Gemini or Prisma
// (matches the sanitize.ts / dedupe.ts convention in this folder).

export interface ParsedFrame {
  id: string;
  /** Raw base64 (the "data:image/...;base64," prefix stripped). */
  data: string;
  mimeType: string;
}

export interface NoteQuestion {
  id: string;
  tMs: number;
  label: string;
  question: string;
  options: string[];
}

export interface VisionVerdict {
  id: string;
  clear?: boolean;
  question?: string;
  options?: string[];
}

const DATA_URL_RE = /^data:(image\/[\w.+-]+);base64,(.+)$/;

export const DEFAULT_NOTE_OPTIONS = [
  "Explain what each one does",
  "Why it matters",
  "Mention briefly",
];

/**
 * Parse a request body's `frames: [{ id, dataUrl }]` into validated frames.
 * Drops any entry missing a string id, a string dataUrl, or a well-formed
 * base64 image data URL. Returns [] for non-array / malformed input — never
 * throws, so a junk body simply degrades to the text-only (pass 1) path.
 */
export function parseFrames(rawFrames: unknown): ParsedFrame[] {
  if (!Array.isArray(rawFrames)) return [];
  return rawFrames.flatMap((f): ParsedFrame[] => {
    const fr = f as { id?: unknown; dataUrl?: unknown };
    if (typeof fr?.id !== "string" || typeof fr?.dataUrl !== "string") return [];
    const m = DATA_URL_RE.exec(fr.dataUrl);
    if (!m) return [];
    return [{ id: fr.id, mimeType: m[1], data: m[2] }];
  });
}

/**
 * Given the groups we sent screenshots for and Gemini's per-group verdicts,
 * return the questions that SURVIVE — the spots vision STILL couldn't resolve.
 *
 * A group is dropped ONLY when its verdict is positively `clear: true`. A
 * `clear: false` verdict OR a MISSING verdict (model failed / omitted the
 * group) keeps the question — we never silently swallow a spot the user marked.
 * Missing question/options fall back to sensible defaults.
 */
export function resolveVisionQuestions(
  framed: Array<{ id: string; tMs: number; label: string }>,
  verdicts: VisionVerdict[],
): NoteQuestion[] {
  return framed.flatMap((g) => {
    const p = verdicts.find((x) => x.id === g.id);
    if (p?.clear === true) return [];
    const options = Array.isArray(p?.options)
      ? p.options.filter((o) => typeof o === "string").slice(0, 3)
      : [];
    return [
      {
        id: g.id,
        tMs: g.tMs,
        label: g.label,
        question:
          typeof p?.question === "string" && p.question
            ? p.question
            : `What do you want to explain about ${g.label}?`,
        options: options.length === 3 ? options : DEFAULT_NOTE_OPTIONS,
      },
    ];
  });
}
