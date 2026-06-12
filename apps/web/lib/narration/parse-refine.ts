// Splits a refine-chat model response into the conversational reply and the
// full revised script.
//
// The system prompt asks the model to emit the script after a line containing
// exactly `---SCRIPT---`. In practice the model drifts: it breaks the delimiter
// across lines (`---\n\nSCRIPT---`), pads it (`--- SCRIPT ---`), lowercases it,
// or varies the dash count. A rigid `raw.indexOf("---SCRIPT---")` missed every
// one of those → `script` came back null → the editor never rendered the
// "Apply to script" button, so the refined script could not be applied.
//
// REGRESSION: see parse-refine.test.ts. The screenshot bug was the model
// emitting `---` then a blank line then `SCRIPT---`.
const SCRIPT_MARKER = /-{2,}\s*SCRIPT\s*-{2,}/i;

export interface RefineParts {
  /** Conversational text before the marker (what the model says it changed). */
  reply: string;
  /** Full revised script after the marker, or null when the model only asked a question. */
  script: string | null;
}

export function parseRefineReply(raw: string): RefineParts {
  const marker = SCRIPT_MARKER.exec(raw);
  const reply = (marker ? raw.slice(0, marker.index) : raw).trim();
  const script = marker ? raw.slice(marker.index + marker[0].length).trim() : null;
  return { reply, script };
}
