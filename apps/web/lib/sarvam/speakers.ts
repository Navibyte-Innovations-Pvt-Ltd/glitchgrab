import { SELF_LABEL, type TranscriptEntry } from "./batch";

/**
 * Put real names on remote speakers (#311).
 *
 * We record the meeting tab, which carries every remote participant mixed into
 * one stream. Sarvam's diarization separates the voices but cannot name them,
 * so the raw result is "Client", "Client (0)", "Client (1)". tldv gets names
 * because its bot joins the call and Google hands it per-speaker streams; we
 * deliberately run no bot, so the names are read off the Meet page instead.
 *
 * Two sources, cheapest first:
 *
 *   1. **Participants** — if exactly one other person is in the call (the usual
 *      demo), every remote line is theirs. No matching needed.
 *   2. **Captions** — Meet prints the speaker's name beside each line. Match a
 *      transcript entry to whichever caption overlaps it in time and take the
 *      name. Words always come from Sarvam; captions contribute nothing but the
 *      name.
 *
 * Anything unmatched keeps its original label. A wrong name is far worse than a
 * generic one — someone will quote it back to a client months later.
 */

export interface MeetCaption {
  speaker: string;
  text: string;
  /** ms since recording start. */
  t: number;
}

/** How far from a caption a transcript line may sit and still be the same utterance. */
const MATCH_WINDOW_SEC = 6;

/** Names that are the operator, not the client — never used for remote lines. */
function isSelf(name: string, selfNames: string[]): boolean {
  const n = name.toLowerCase();
  return selfNames.some((s) => s.toLowerCase() === n);
}

/**
 * The remote participants — everyone in the call who is not the operator.
 * Meet's DOM also yields UI strings ("Presenting", "You"), so anything that
 * doesn't look like a person's name is dropped.
 */
export function remoteParticipants(participants: string[], selfNames: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of participants) {
    const name = raw.trim();
    if (!name || name.length > 60) continue;
    if (isSelf(name, selfNames)) continue;
    // Meet appends state to tile labels ("Asha Rao, presenting"); keep the name.
    const clean = name.split(",")[0].trim();
    if (!clean || /^(you|presenting|muted|pinned)$/i.test(clean)) continue;

    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }

  return out;
}

/**
 * Rewrite remote speaker labels with real names where we can prove one.
 *
 * `entries` must already be merged and offset-corrected — caption times and
 * transcript times share the recording's clock.
 */
export function applySpeakerNames(
  entries: TranscriptEntry[],
  options: {
    captions?: MeetCaption[];
    participants?: string[];
    /** Names belonging to the operator, so their own tile never names the client. */
    selfNames?: string[];
  }
): TranscriptEntry[] {
  const selfNames = options.selfNames ?? [];
  const remote = remoteParticipants(options.participants ?? [], selfNames);
  const captions = (options.captions ?? [])
    .filter((c) => !isSelf(c.speaker, selfNames))
    .sort((a, b) => a.t - b.t);

  // A one-on-one call needs no matching at all: every remote line is theirs.
  const soleRemote = remote.length === 1 ? remote[0] : null;

  return entries.map((entry) => {
    if (entry.speaker === SELF_LABEL) return entry;

    if (soleRemote) return { ...entry, speaker: soleRemote };

    const named = captionSpeakerAt(captions, entry.startSec);
    return named ? { ...entry, speaker: named } : entry;
  });
}

/**
 * The caption speaker closest in time, within the match window.
 *
 * `captions` must be sorted by `t` (the caller sorts once). Bails out as soon
 * as the captions run past the window instead of scanning the rest: a one-hour
 * call is ~500 transcript lines against ~2000 captions, and the naive form is a
 * million iterations inside a request that is already doing Sarvam I/O.
 */
function captionSpeakerAt(captions: MeetCaption[], startSec: number): string | null {
  if (captions.length === 0) return null;

  let best: { speaker: string; distance: number } | null = null;

  for (const caption of captions) {
    const delta = caption.t / 1000 - startSec;
    if (delta > MATCH_WINDOW_SEC) break; // sorted — everything after is further
    const distance = Math.abs(delta);
    if (distance > MATCH_WINDOW_SEC) continue;
    if (!best || distance < best.distance) best = { speaker: caption.speaker, distance };
  }

  return best?.speaker ?? null;
}
