// Surgical, paragraph-level merge for refine-chat edits.
//
// THE PROBLEM this solves: the refine endpoint used to make the model rewrite
// the WHOLE script every chat turn. Users hand-tune earlier paragraphs to sync
// with their video clips, so a full rewrite silently clobbered that tuning and
// forced them to redo the clip adjustments. The fix: address paragraphs by
// index, let the model emit ONLY the ones it changes, and reuse the ORIGINAL
// bytes for everything else IN CODE — never trusting the model to "leave the
// rest alone" (model drift IS the bug we're fixing).
//
// Segmentation unit = blank-line paragraph. `[SECTION]` headers are optional in
// the generate prompt and absent from many real scripts, so paragraphs are the
// only universally-present anchor.

/** Split a script into blank-line paragraphs. Trimmed once so indices are
 *  stable across turns (a merged script feeds back in as the next currentScript). */
export function splitParagraphs(script: string): string[] {
  const trimmed = script.trim();
  if (!trimmed) return [];
  return trimmed.split(/\n{2,}/);
}

/** Render the script with each paragraph addressed, e.g. `[#0]\n<para>`. This is
 *  what the model sees when refining; the `[#n]` lines are addresses, not text. */
export function numberParagraphs(script: string): string {
  return splitParagraphs(script)
    .map((p, i) => `[#${i}]\n${p}`)
    .join("\n\n");
}

/** A paragraph edit: index → replacement text. Empty replacement = delete. A
 *  replacement may itself contain blank lines (one paragraph expanding to many). */
export type ParagraphPatch = Map<number, string>;

// Matches an address line like `[#3]` (also tolerates `[ # 3 ]` drift).
const ADDR = /\[\s*#\s*(\d+)\s*\]/g;

/** Parse a model body into an index→replacement patch. Returns null when no
 *  `[#n]` address is present — the caller then falls back to whole-script
 *  replacement (fresh / sectionless / old-style outputs stay supported). */
export function parseParagraphPatch(body: string): ParagraphPatch | null {
  const markers = [...body.matchAll(ADDR)];
  if (!markers.length) return null;

  const ops: ParagraphPatch = new Map();
  for (let i = 0; i < markers.length; i++) {
    const idx = Number.parseInt(markers[i][1], 10);
    const start = markers[i].index! + markers[i][0].length;
    const end = i + 1 < markers.length ? markers[i + 1].index! : body.length;
    // Drop the single newline that follows the address line, keep internal
    // blank lines (expansion), trim trailing whitespace.
    const content = body.slice(start, end).replace(/^[ \t]*\r?\n/, "").trimEnd();
    ops.set(idx, content);
  }
  return ops;
}

/** Apply a paragraph patch to the current script. Untouched paragraphs are
 *  reused VERBATIM from the original — this is the byte-identical guarantee the
 *  whole feature exists to provide. Out-of-range indices are ignored. */
export function mergeParagraphEdit(currentScript: string, ops: ParagraphPatch): string {
  const paras = splitParagraphs(currentScript);
  const out: string[] = [];
  for (let i = 0; i < paras.length; i++) {
    if (ops.has(i)) {
      const replacement = ops.get(i)!;
      if (replacement.trim() !== "") out.push(replacement); // empty = delete → skip
    } else {
      out.push(paras[i]); // untouched → original bytes
    }
  }
  return out.join("\n\n");
}
