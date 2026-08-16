/**
 * Google Meet page watchers (#311) — who is on the call, and who said what.
 *
 * Why this exists: we capture the meeting **tab's** audio, which is every
 * remote participant already mixed into one stream. Sarvam's diarization can
 * tell those voices apart but has no way to name them — you get "Client (0)",
 * "Client (1)". tldv gets names because it joins the call as a participant and
 * Google hands it per-speaker streams; we deliberately do not run a bot.
 *
 * So we read the names off the page instead:
 *   1. **Participants** — who is in the call. On a 1-on-1 (the common demo
 *      case) that single name replaces "Client" outright.
 *   2. **Captions** — Meet's caption panel prints each line next to the
 *      speaker's name. Used ONLY to attribute names to time ranges; the words
 *      still come from Sarvam, which is far more accurate and handles
 *      Marathi/Hindi properly.
 *
 * Everything here is best-effort DOM reading of an app we do not control.
 * Meet ships obfuscated, changing class names, so selectors are layered
 * structural → semantic and every failure is silent: losing names must never
 * cost the recording.
 */

export interface MeetCaption {
  speaker: string;
  text: string;
  /** ms since recording start. */
  t: number;
}

type CaptionSink = (caption: MeetCaption) => void;
type ParticipantSink = (names: string[]) => void;

/** Meet renders captions inside a region it labels for screen readers. */
function findCaptionRegion(): HTMLElement | null {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>('[role="region"], [aria-live="polite"]')
  );

  for (const el of candidates) {
    const label = (el.getAttribute("aria-label") ?? "").toLowerCase();
    if (label.includes("caption") || label.includes("subtitle")) return el;
  }

  // Fallback: Meet's caption container historically carries this class. Kept
  // as a second chance only — it WILL rot, and the aria route above is the
  // one meant to last.
  return document.querySelector<HTMLElement>(".a4cQT");
}

/**
 * Pull `{ speaker, text }` out of one caption row.
 *
 * Structure is "avatar image, name, spoken text". Rather than depend on class
 * names, take the first short text node as the name and the longest as the
 * line — that survives markup changes better than any selector.
 */
function parseCaptionRow(row: HTMLElement): { speaker: string; text: string } | null {
  const texts = Array.from(row.querySelectorAll<HTMLElement>("span, div"))
    .map((el) => (el.childElementCount === 0 ? (el.textContent ?? "").trim() : ""))
    .filter(Boolean);

  if (texts.length < 2) return null;

  // A display name is short and has no sentence punctuation; the spoken line is
  // whatever is longest.
  const speaker = texts.find((t) => t.length <= 40 && !/[.?!]$/.test(t));
  const text = texts.reduce((a, b) => (b.length > a.length ? b : a), "");

  if (!speaker || !text || speaker === text) return null;
  return { speaker, text };
}

/**
 * Watch the caption panel.
 *
 * Meet rewrites a caption line in place as the sentence is recognised, so the
 * same row fires many mutations. Only the final form of each row is emitted —
 * keyed on speaker + row identity, flushed when the text stops growing.
 */
export function watchCaptions(startedAt: number, sink: CaptionSink): () => void {
  const pending = new Map<HTMLElement, { speaker: string; text: string; t: number }>();
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    for (const [row, entry] of pending) {
      sink({ speaker: entry.speaker, text: entry.text, t: entry.t });
      pending.delete(row);
    }
  };

  const observer = new MutationObserver(() => {
    const region = findCaptionRegion();
    if (!region) return;

    for (const row of Array.from(region.children) as HTMLElement[]) {
      const parsed = parseCaptionRow(row);
      if (!parsed) continue;

      const existing = pending.get(row);
      if (existing) {
        existing.text = parsed.text;
        existing.speaker = parsed.speaker;
      } else {
        pending.set(row, { ...parsed, t: Date.now() - startedAt });
      }
    }

    // Meet keeps amending a line for a second or two after it appears; wait for
    // quiet before treating it as final.
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 1500);
  });

  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  return () => {
    observer.disconnect();
    if (flushTimer) clearTimeout(flushTimer);
    flush();
  };
}

/**
 * Names currently in the call, best-effort.
 *
 * Meet puts each tile's display name in an aria-label or a data attribute. We
 * collect anything that looks like a person and let the server decide what to
 * do with it — notably, a single remote name is enough to stop calling them
 * "Client".
 */
export function readParticipants(): string[] {
  const names = new Set<string>();

  // ATTRIBUTES ONLY — never `textContent`. A tile's text subtree also carries
  // mic state, "Presenting", pinned indicators and sometimes the meeting code,
  // and each of those would land here as a separate "participant". That matters
  // more than it sounds: the whole 1-on-1 shortcut is "exactly one remote
  // name", so a single stray string disables it.
  for (const tile of Array.from(document.querySelectorAll<HTMLElement>("[data-participant-id]"))) {
    const candidates = [
      tile.getAttribute("data-self-name"),
      tile.getAttribute("aria-label"),
      tile.querySelector<HTMLElement>("[data-self-name]")?.getAttribute("data-self-name"),
    ];

    for (const raw of candidates) {
      const name = (raw ?? "").trim();
      if (name && name.length <= 60) names.add(name);
    }
  }

  // Deliberately NOT reading `[role="listitem"]`: Meet reuses it for chat
  // messages and reaction rows, so it drags whole sentences in as names.

  return [...names];
}

/**
 * Raw scraper output, for tuning the filter against a real call.
 *
 * Meet's DOM is obfuscated and undocumented, so the honest way to write the
 * name filter is to look at what a real meeting actually produces rather than
 * guess. Logged once per call, at start.
 */
export function debugParticipants(): void {
  try {
    console.log("[GG] Meet participants (raw):", JSON.stringify(readParticipants()));
  } catch {
    /* logging must never break a recording */
  }
}
