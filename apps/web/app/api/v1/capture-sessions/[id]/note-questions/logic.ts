// Pure, side-effect-free helpers for the note-questions VISION pass, extracted
// from route.ts so they're unit-testable without mocking Gemini or Prisma
// (matches the sanitize.ts / dedupe.ts convention in this folder).

export interface ParsedFrame {
  id: string;
  /** Raw base64 (the "data:image/...;base64," prefix stripped). */
  data: string;
  mimeType: string;
}

interface NoteQuestion {
  id: string;
  tMs: number;
  label: string;
  question: string;
  options: string[];
}

interface VisionVerdict {
  id: string;
  clear?: boolean;
  question?: string;
  options?: string[];
}

// ── System prompts ───────────────────────────────────────────────────────────
// Exported so the route uses them AND they can be exercised verbatim by tests /
// experiments (no copy-paste drift).

// PASS 1 — text only. Judge each marked group from its label + metadata.
export const QUESTION_SYSTEM_PROMPT = `The user recorded a screen flow and HELD SHIFT over elements to flag "I want to explain THIS here." The notes are pre-GROUPED: each group is one or more sibling elements the user marked together (e.g. the Google / Phone / Email sign-up buttons).

ONLY ASK WHERE YOU'RE GENUINELY UNSURE (most important):
- Do NOT ask a question for every group. Ask ONLY where the marked element's identity AND purpose are NOT obvious from the label + metadata — where you would have to GUESS what the user wants explained.
- Mark a group as "clear": true (no question needed) when the label + meta make it obvious what the element is and why it'd be explained — a self-evident single control (e.g. a "Start Free Trial" button, a "monthly plan" card, a clearly-labelled "UPI QR code" upload). For these the script can be written directly; don't pester the user.
- Mark a group as "clear": false (DO ask) only when it's genuinely ambiguous: a generic/vague label ("this", "Continue", a result row), or the captured element likely isn't the one the user meant (cursor-vs-intended mismatch).
- A multi-element set that is itself CLEARLY LABELLED (e.g. "Continue with Google / Phone / Email", "Student / Library Owner") is NOT ambiguous — you already know what to say. DEFAULT to "explain each briefly" and mark "clear": true. Do NOT ask the user merely to pick an emphasis for an obvious set. Only mark clear:false if the set's PURPOSE (not how much to dwell on it) is genuinely unclear.
- If EVERY group is clear, return an empty array — that's a good outcome, not a failure.

For each group you DO ask about, produce:
- ONE short question — max ~12 words, a single plain question, NO explanatory sentences tacked on (e.g. "Explain the sign-up options?", NOT "...Pick your timings and adjust the hours to match your library. Most pick Full Day — you can ch?"). Long questions get truncated in the UI.
- exactly 3 likely answer options — concise phrases the user can pick.

GROUP RULES:
- If a group has MULTIPLE elements (e.g. Google, Phone, Email), the question is about the SET ("...about the sign-up options?") and at least one option should explain WHAT EACH ONE DOES (e.g. "Explain each: Google = one-tap, Phone = OTP via SMS, Email = email + password"). Do NOT ask three separate questions for siblings.
- Use ALL metadata, especially meta.controls (child buttons inside the element, e.g. "Add", "Claim") and meta.fullText. If an element exposes distinct sub-actions (Add AND Claim), the options MUST be about those (e.g. "Add = register a new library from Google; Claim = take ownership of one already in our database"). No generic options when the metadata reveals specific features.

Return ONLY valid JSON: an array of objects { "id": string, "clear": boolean, "question": string, "options": [string, string, string] }. Include an entry for EVERY group with its "clear" verdict; for clear groups "question"/"options" may be empty. Use the provided group id for each. No prose, no markdown fences.`;

// PASS 2 — vision. The first pass flagged some groups as still-unclear from text
// alone; we now hand the model a SCREENSHOT of each one (the exact frame at the
// moment the user marked it) and ask it to resolve what it can SEE. Most "what is
// this element" doubt disappears once it can look — so it should flip most groups
// to clear:true. Keep clear:false ONLY for a genuine user-preference fork a
// picture can't settle (how much to dwell on a set the user singled out).
export const VISION_SYSTEM_PROMPT = `You previously asked for clarification about some elements a user marked ("explain THIS here") in a screen recording, because their TEXT label/metadata was ambiguous. You now have a SCREENSHOT of each marked element, captured at the exact moment it was marked.

Look at each screenshot and RE-DECIDE:
- "clear": true  → the picture makes the element's identity AND purpose obvious, so you can narrate it confidently WITHOUT bothering the user. THIS SHOULD BE MOST OF THEM — the whole point of the screenshot is to stop asking.
- "clear": false → keep asking ONLY if, even WITH the picture, there's a real choice that's the user's to make (e.g. a set they clearly singled out where "explain each vs. mention briefly" is a genuine preference, not something the image decides).

When clear:false, give ONE short question (≤12 words) + exactly 3 concise answer options, same rules as before (a multi-element set → question about the SET, one option explaining what each does).

Each group is given as "Group <id>: <label>" followed by its screenshot, in order. Return ONLY valid JSON: an array of { "id": string, "clear": boolean, "question": string, "options": [string, string, string] } — one entry per group id provided. No prose, no markdown fences.`;

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
