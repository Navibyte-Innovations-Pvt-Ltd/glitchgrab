/**
 * Distillation prompt (#311 Phase A).
 *
 * Turns a block of raw project text — a bug report, a QA failure note, pasted
 * call notes — into a small set of durable facts about the project. The output
 * is the unit of project memory: many of these on one Repo answer "what did the
 * client ask for, what shipped, what's still broken, what did we promise".
 *
 * The hard rule is the same one the narration prompt lives by: **never invent**.
 * A wrong distilled "commitment" is worse than a missing one — someone will act
 * on it months later with no way to check.
 */

export const CONTEXT_KINDS = ["DECISION", "REQUEST", "COMPLAINT", "COMMITMENT", "FACT"] as const;
export type ContextKindName = (typeof CONTEXT_KINDS)[number];

/**
 * Items below this are dropped rather than stored. A hedged distillation is
 * noise in a timeline people are meant to trust.
 */
export const MIN_CONFIDENCE = 0.5;

export const DISTILL_SYSTEM_PROMPT = `You extract durable project facts from raw project material (bug reports, QA notes, meeting notes, client messages).

You output ONLY a JSON array. No prose, no markdown fences, no commentary.

Each element:
{
  "kind": "DECISION" | "REQUEST" | "COMPLAINT" | "COMMITMENT" | "FACT",
  "text": "one self-contained sentence",
  "confidence": 0.0-1.0
}

What each kind means:
- DECISION — a choice that was made and settled. "Billing moves to monthly-only."
- REQUEST — something someone asked for that is not yet agreed or built. "Client wants a CSV export on the reports page."
- COMPLAINT — dissatisfaction with something that exists. "Client says the dashboard is too slow on mobile."
- COMMITMENT — a promise WE made, ideally with a time. "We said the invoice PDF ships before the end of March."
- FACT — durable context that is none of the above. "Their accounting team of 4 uses the tool daily."

Rules:
1. NEVER invent. Every item must be traceable to words actually in the input. If the input does not say it, it does not exist.
2. Self-contained. Each "text" must make sense read alone, months later, with no other context. Resolve pronouns: write "the client" or the actual feature name, never "it" or "they".
3. Durable only. Skip anything true for five minutes: stack traces, one-off error strings, "clicked the button", browser versions, URLs, ids. A bug that will be closed tomorrow is not project memory; a pattern of the client complaining about speed is.
4. No duplicates. If the input says the same thing three ways, emit it once.
5. Prefer few. An input with nothing durable in it returns []. An empty array is a correct and common answer — returning padding is a failure.
6. Confidence is honest. 1.0 = stated outright. 0.7 = clearly implied. Below 0.5 = you are guessing, so do not emit it at all.
7. Keep the original language of the input. Do not translate.
8. Max 8 items per input, hard.

Output the JSON array and nothing else.`;

/** Wrap one source's raw text with the little framing the model needs. */
export function buildDistillUserPrompt(params: {
  /** Human label for where this came from, e.g. "Bug report" / "Pasted call notes". */
  sourceLabel: string;
  /** ISO date the material is about. */
  occurredAt: string;
  text: string;
}): string {
  return `Source: ${params.sourceLabel}
Date: ${params.occurredAt}

--- material ---
${params.text}
--- end material ---

Extract the durable project facts. JSON array only.`;
}
