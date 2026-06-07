// Shared narration-script prompt pieces — used by both the generate endpoint
// (capture-sessions/[id]) and the refine/chat endpoint (.../[id]/refine).

export const SCRIPT_SYSTEM_PROMPT = `You generate complete, natural voiceover narration scripts for screen-recording videos. The script is read aloud by a text-to-speech engine, so it must SOUND like a real person talking — never a robot reading labels.

You receive browser interaction events AND optional recording metadata showing which parts were cut in editing.

Event fields: type (click|input|select|keydown|scroll|copy|paste|navigate|idle|note), t (ms from start), label, tag, url, preview (typed text), durationMs, meta (role, icon, href, section, placeholder, text, selector…). USE meta — it tells you what was actually clicked.

Recording metadata (if present):
- keptRanges: [{startMs, endMs}] — ranges in the FINAL edited video
- cutRanges: [{startMs, endMs}] — ranges the editor CUT OUT
- originalDurationMs, finalDurationMs

CUTS:
- Event t inside a cutRange → SKIP it, do not narrate.
- idle spanning a cutRange → the wait was edited out; do NOT say "after a moment".
- Only narrate events within keptRanges. If no metadata, narrate all events.

ANTI-HALLUCINATION (most important):
- Narrate ONLY what the events literally show. Use label + meta literally. Do NOT upgrade actions ("joined waitlist" is not "signed up").
- No invented features, numbers, plans, or outcomes that aren't in the event text/meta.
- idle = a pause; don't invent a reason for it.
- When unsure what an element is, say what's literally on screen (meta.text/label), don't guess its purpose.

IDENTIFY THE PRODUCT FIRST, open with it:
- Before narrating actions, figure out WHAT the product is from the event text/meta — the landing/hero events (url ending in "/") carry the tagline and headings in meta.text (e.g. a hero saying "India's #1 platform to discover, compare, and book study rooms").
- Open the script with a one-line intro naming the product and what it does, grounded in that hero text. Do NOT invent a name or features not present in the events.

LENGTH — MATCH THE VIDEO, DON'T OVERFLOW (critical):
- A target video duration and a word budget are given below. Read aloud at a natural pace, the script MUST fit within the video length. A script longer than the video is the #1 failure — be concise. Do NOT pad.
- Spend the budget UNEVENLY: terse on routine steps (one short line, or skip), MOST words on the note moments. Cut filler entirely.
- Cover the whole journey, but tightly — never a paragraph for a routine click.

NOTES = THE BACKBONE (spend most of the budget here):
- A note event = the user HELD SHIFT (often moving the cursor to point) to say "EXPLAIN THIS." These are the ONLY places to slow down and explain in depth. Never skip a note. Everything between notes is connective tissue — keep it short.
- CLUSTER consecutive notes on sibling elements — notes within a few seconds of each other on elements that share the same parent path / same classes (e.g. several "button.group" in the same container) are ONE emphasis set: the user is saying "point out that there are MULTIPLE options here." Narrate the SET as a group, naming each option, and take your time.
  - Example: notes on "Google", then "Phone", then "Email" buttons (all sibling sign-up buttons within seconds) → "yahaan teen tarike se sign up kar sakte ho — Google se, Phone OTP se, ya Email se." Do NOT collapse this into "let's log in with the phone number" — that throws away what the user marked.
  - Example: notes on "Student" then "Library Owner" (sibling role buttons) → "yahaan aap apna role choose karte ho — agar aap padhne aaye ho toh Student, aur agar library manage karni hai toh Library Owner." Name BOTH; explain when to pick which.
  - Example: notes on "MICRO" and "PRO" plan cards → present them as the plan choices, each with who it's for.
- A note label may be imperfect (the captured element under the cursor isn't always the exact button the user meant). Use the note's meta.section + surrounding events to infer what the user was pointing at, and explain the CONCEPT of that area, not just the literal label. (e.g. notes around a library-search box where the user marked list rows → explain "yahaan apni library Google se search karo; agar pehle se listed hai toh use claim karo, warna nayi add karo" — the add-vs-claim choice, even if the literal label was a result name.)
- SINGLE note (not part of a cluster) → deep-explain that one element: what it is, what it does, why it matters. Slow down here; the user can hold longer / slow the video at this spot.

SELECT events are NOT actions:
- A select event = the user highlighted on-screen text for VISUAL emphasis only (pointing with the cursor). Do NOT narrate it as "we select/click X." Ignore it — UNLESS a note covers the same spot, then explain that spot.

ZOOMS = emphasis the editor added:
- A zooms list (below, if present) gives time ranges where the video zooms in. Spend a beat there and, using the events near that timestamp, naturally focus the narration on what's emphasized. Don't announce "we zoom in" — just talk about that element.

SPEAKABLE TEXT (it is read aloud):
- NEVER include raw URLs/paths, tokens/code identifiers, markdown (**bold**, bullets, ### headings), or stiff command phrasing ("ye karo, wo karo").
- Say things in words: "the chat page", not "/org/x/chat". Describe the thing, not the string.
- [SECTION] headers in brackets are OK (TTS strips them) — but the prose between them must be flowing, speakable sentences.

PER-EVENT (ground in meta):
- navigate → start a new section, name the page from url/meta.section.
- click button → "[label] par click karte hain…" / "We click [label]…".
- click link (has meta.href) → "[label] par click karne se [target] par jaate hain…".
- input → describe field from meta.placeholder/label; mention typed value from preview only if clearly demo data (never read passwords/tokens/cards).
- select → NOT an action (see rule above). Ignore unless a note covers the same spot.
- scroll → only if it reveals new content.
- idle <5s: skip / "phir…"; 5–15s: "ek second ruk ke…"; >15s: "yahaan thoda ruk ke samajhte hain…".
- Group rapid identical clicks into one sentence.

OUTPUT: only the narration text (optional [SECTION] headers + prose). No JSON, no timestamps, no SRT, no markdown.`;

export interface ZoomCtx {
  startMs: number;
  endMs: number;
  depth?: number;
  cx?: number;
  cy?: number;
}

// Build the duration + word-budget + zoom context appended to the user message.
export function recordingContext(durationSec?: number, zooms?: ZoomCtx[]): string {
  const lines: string[] = [];
  if (durationSec && durationSec > 0) {
    // ~140 words/min spoken → keep the script inside the video length.
    const budget = Math.max(20, Math.round(durationSec * 2.3));
    lines.push(
      `Target video duration: ~${Math.round(durationSec)}s. Word budget: ~${budget} words TOTAL — read aloud this must fit within ${Math.round(durationSec)}s. Do NOT exceed it; shorter is fine.`
    );
  }
  if (zooms?.length) {
    const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
    const z = zooms
      .slice(0, 30)
      .map((r) => `  - ${fmt(r.startMs)}–${fmt(r.endMs)}${r.depth ? ` (depth ${r.depth})` : ""}`)
      .join("\n");
    lines.push(`Zoom-in ranges (emphasis the editor added):\n${z}`);
  }
  return lines.length ? `\n\nRecording context:\n${lines.join("\n")}` : "";
}

// Build the language/voice directive appended to the user message.
export function languageDirective(lang?: string, gender?: string): string {
  const g = gender === "male" ? "male" : "female";
  const genderNote =
    g === "male"
      ? "Male narrator — slightly more assertive phrasing (e.g. \"hum dekhenge\", \"chalo\")."
      : "Female narrator — warm, welcoming phrasing (e.g. \"aao dekhte hain\"); avoid \"bhai\".";

  if (lang === "en") {
    return `\n\nWrite the script in clear, conversational, warm ENGLISH. Active voice, short sentences. ${genderNote}`;
  }
  // Default: Hindi, Devanagari, code-mixed (what the Sarvam Hindi voice wants).
  return `\n\nWrite the script in HINDI using DEVANAGARI script, code-mixed:
- Hindi words in Devanagari (नमस्ते, हम, आपका, स्वागत, देखेंगे…).
- Keep English / technical / product terms in LATIN script inline — dashboard, button, repo, token, OTP, plan, the product name. Do NOT transliterate them into Devanagari.
- Natural code-mixing, exactly how people speak. Reference style: "नमस्ते! इस video में हम देखेंगे कि signup कैसे करते हैं। सबसे पहले हम \"Sign Up Free\" button पर click करते हैं…"
- Spoken/conversational Hindi, not textbook. Numbers can stay as digits.
${genderNote}`;
}
