// Refine-chat pipeline pieces, shared by the route (.../[id]/refine) and the
// real-Gemini integration test. Kept DB-free so the test can exercise the exact
// model→parse→merge path the route runs, without a CaptureSession row.

import {
  SCRIPT_SYSTEM_PROMPT,
  recordingContext,
  languageDirective,
  type ZoomCtx,
} from "./prompt";
import { parseRefineReply } from "./parse-refine";
import { numberParagraphs, parseParagraphPatch, mergeParagraphEdit } from "./merge-edit";

// The refine-specific instruction. It REPLACES the old "output the COMPLETE
// revised script" mandate — that mandate is exactly what clobbered hand-tuned
// paragraphs. Now the model emits only the `[#n]` blocks it changes.
const REFINE_INSTRUCTION = `

You are now REFINING an existing script through a CHAT with the user. The CURRENT SCRIPT below is shown with every paragraph addressed like [#0], [#1], [#2]. Those address lines are NOT part of the narration — they are handles so you can point at a paragraph.

THE USER IS AUTHORITATIVE NOW (this OVERRIDES the "ground only in the events / never invent" rule above):
- That rule governs the FIRST draft, when the events are your only source. In this refine chat, the USER is a second, HIGHER source of truth. The events are an incomplete recording — many real actions (mouse drags on a canvas, seat-map painting, off-screen or off-DOM steps) leave NO event. The user was there; you were not.
- So when the user tells you what they did or what should be said — e.g. "I also created seats 33 to 37 facing down, then 53 to 57 up", "I used Cmd+Z to undo", "mention the office and rest area" — TREAT IT AS FACT and write it into the narration, even when nothing in the events confirms it. Do NOT reply that you "can't find it in the events", do NOT hedge, do NOT refuse. Folding the user's correction into the script IS the task.
- You still must not invent details the user did NOT give. Add exactly what they told you, in their stated order/direction/numbers — no more.

ALWAYS DELIVER THE EDIT (do not just talk):
- If the user asks for ANY content change, you MUST output the ---SCRIPT--- marker and the changed [#n] block(s). Replying with only prose ("I've updated it to mention every block…") WITHOUT a ---SCRIPT--- section makes NO change reach the script and is a failure — never do this.
- Omit ---SCRIPT--- ONLY when you genuinely need to ask one clarifying question. Never omit it merely to acknowledge or claim you changed something.

PRESERVE UNTOUCHED PARAGRAPHS (most important rule here):
- The user has usually hand-tuned earlier paragraphs so they line up with their video clips. Re-writing a paragraph they didn't ask about breaks that sync and makes them redo work. So change ONLY the paragraphs the request is about; leave every other paragraph completely alone.
- Do NOT re-output the whole script. Output ONLY the paragraphs you are changing.

HOW TO REPLY:
- First, one short line saying what you changed.
- Then a line containing exactly:
---SCRIPT---
- After that, each changed paragraph as a block led by its address line, e.g.:
[#3]
new text for paragraph 3
[#5]
new text for paragraph 5
- To leave a paragraph unchanged: simply DO NOT mention its [#n]. Never re-emit an unchanged paragraph.
- To EXPAND one paragraph into several: put multiple paragraphs (separated by a blank line) inside that single [#n] block.
- To DELETE a paragraph: output its [#n] line followed by nothing.
- If the request is genuinely ambiguous: ask one short question and do NOT include ---SCRIPT--- or any [#n] block.
- Every paragraph you DO emit must still obey ALL the rules above (length budget, notes clustering, speakable text, language/TTS format).`;

export interface RefineSystemOpts {
  lang?: string;
  gender?: string;
  durationSec?: number;
  zooms?: ZoomCtx[];
}

/** Full system prompt for a refine turn. */
export function buildRefineSystem(opts: RefineSystemOpts): string {
  return (
    SCRIPT_SYSTEM_PROMPT +
    REFINE_INSTRUCTION +
    recordingContext(opts.durationSec, opts.zooms) +
    languageDirective(opts.lang, opts.gender)
  );
}

/** Leading context turn: the events + the NUMBERED current script. */
export function buildRefineContextTurn(args: {
  eventsJson: string;
  appLine: string;
  metaSection: string;
  currentScript?: string;
}): string {
  const numbered = args.currentScript?.trim()
    ? numberParagraphs(args.currentScript)
    : "(empty — write a fresh script)";
  return `Events:\n${args.eventsJson}${args.appLine}${args.metaSection}\n\nCURRENT SCRIPT (each paragraph is addressed [#n]; refine per my next messages):\n${numbered}`;
}

export interface RefineResult {
  /** Short conversational line (what changed / a clarifying question). */
  reply: string;
  /** Merged full script ready to drop into the narration box, or null when the
   *  model only asked a clarifying question. */
  script: string | null;
}

/** Turn raw model output into the final script. Pure — unit-testable without a
 *  network call. Three paths:
 *  1. no ---SCRIPT--- marker        → clarifying question (script = null)
 *  2. marker, no [#n] blocks         → whole-script replace (back-compat)
 *  3. marker + [#n] blocks           → surgical paragraph merge */
export function resolveRefinement(raw: string, currentScript: string): RefineResult {
  const { reply, script: body } = parseRefineReply(raw);
  if (body == null) return { reply, script: null };

  const ops = parseParagraphPatch(body);
  if (!ops) return { reply, script: body }; // fallback: full replacement

  return { reply, script: mergeParagraphEdit(currentScript, ops) };
}
