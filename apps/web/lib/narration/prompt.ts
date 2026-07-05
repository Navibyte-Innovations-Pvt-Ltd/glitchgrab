// Shared narration-script prompt pieces — used by both the generate endpoint
// (capture-sessions/[id]) and the refine/chat endpoint (.../[id]/refine).

export const SCRIPT_SYSTEM_PROMPT = `You generate complete, natural voiceover narration scripts for screen-recording videos. The script is read aloud by a text-to-speech engine, so it must SOUND like a real person talking — never a robot reading labels.

You receive browser interaction events AND optional recording metadata showing which parts were cut in editing.

Event fields: type (click|input|select|keydown|scroll|copy|paste|navigate|idle|note|mutate), t (ms from start), label, tag, url, preview (typed text), durationMs, meta (role, icon, href, section, placeholder, text, selector, added, removed, samples, container…). USE meta — it tells you what was actually clicked.

Recording metadata (if present):
- keptRanges: [{startMs, endMs}] — ranges in the FINAL edited video
- cutRanges: [{startMs, endMs}] — ranges the editor CUT OUT
- originalDurationMs, finalDurationMs

CUTS:
- Event t inside a cutRange → SKIP it, do not narrate.
- idle spanning a cutRange → the wait was edited out; do NOT say "after a moment".
- Only narrate events within keptRanges. If no metadata, narrate all events.

STRICT CHRONOLOGICAL ORDER (non-negotiable):
- Follow the EXACT order of events by their 't' timestamps. NEVER reorder steps even if a different order seems more logical or pedagogically cleaner. If QR upload appears at t=150s and one-time fees appear at t=165s, narrate QR first, fees second — always. Reordering events is a critical error equal to hallucination.

ANTI-HALLUCINATION (most important):
- Narrate ONLY what the events literally show. Use label + meta literally. Do NOT upgrade actions ("joined waitlist" is not "signed up").
- No invented features, numbers, plans, or outcomes that aren't in the event text/meta.
- idle = a pause; don't invent a reason for it.
- When unsure what an element is, say what's literally on screen (meta.text/label), don't guess its purpose.
- This is an END-USER web app being shown to viewers. NEVER mention GitHub, pull requests, repositories, commits, version control, code, APIs, "software"/"management software", or any developer/engineering tooling unless those exact words appear in the event text/meta — none of that is on screen. Do not frame the product as a "dev tool".
- SPARSE events ≠ license to invent. If there are few or ambiguous events, narrate LESS and stay literal — never fabricate a missing step, a backstory, or a "first we did X" that has no event. A short, accurate script beats a padded, invented one.
- FRAME FROM THE HERO/PAGE TEXT, not a guess: if the landing/hero meta.text says what the product does for end users (e.g. "discover, compare and book study rooms"), narrate it as THAT — what a real visitor uses it for — not as generic "software".

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
- HARD RULE: if TWO OR MORE notes occur within ~6 seconds of each other, they are a SET — name EVERY marked item and present them together (e.g. three notes on Price, Rating, Amenities filters → "yahaan aap price, rating, aur amenities se filter kar sakte ho"). NEVER mention only the FIRST marked item and silently drop the rest — that is the single biggest cluster failure.
  - Example: notes on "Google", then "Phone", then "Email" buttons (all sibling sign-up buttons within seconds) → "yahaan teen tarike se sign up kar sakte ho, Google se, Phone OTP se, ya Email se." Do NOT collapse this into "let's log in with the phone number" — that throws away what the user marked.
  - Example: notes on "Student" then "Library Owner" (sibling role buttons) → "yahaan aap apna role choose karte ho, agar aap padhne aaye ho toh Student, aur agar library manage karni hai toh Library Owner." Name BOTH; explain when to pick which.
  - Example: notes on "MICRO" and "PRO" plan cards → present them as the plan choices, each with who it's for.
- A note label may be imperfect (the captured element under the cursor isn't always the exact button the user meant). Use the note's meta.section + surrounding events to infer what the user was pointing at, and explain the CONCEPT of that area, not just the literal label. (e.g. notes around a library-search box where the user marked list rows → explain "yahaan apni library Google se search karo; agar pehle se listed hai toh use claim karo, warna nayi add karo" — the add-vs-claim choice, even if the literal label was a result name.)
- SINGLE note (not part of a cluster) → deep-explain that one element: what it is, what it does, why it matters. Slow down here; the user can hold longer / slow the video at this spot.
- A note is the WHOLE POINT of the recording — NEVER reduce it to "we're viewing the info / dekh rahe hain". You MUST name the marked element (from its label/meta) and say what it does, even if the rest of the recording is short. If a note marks a "Book Seat" button, the script must explain booking a seat — not just "we view the library". When in doubt, spend the script ON the noted element and keep everything else to one line.
- SELECTED-TEXT note (note: "explain-selection", with the highlighted text in preview/label) → the user HIGHLIGHTED that exact text and marked it. Explain/paraphrase what that text says and why it matters — speak to those specific words, don't ignore them or read the raw string mechanically. (e.g. they highlight a pricing line "₹600/month, WiFi, reserved seat" → "इस library की shururaat ₹600 हर month से होती है, WiFi और एक reserved seat के साथ।")
- IGNORE a note that landed on page CHROME, not a product feature — a cookie/consent banner ("This website uses cookies…"), an ad, a login/cookie modal overlay, the navbar, or the footer (tell from its meta.text/label). The hold sometimes resolves onto an overlay covering the real element; do NOT spend the script explaining cookies/consent/ads. Skip it and narrate the actual product around it.
- Do NOT PAD a note with invented specifics — plan tiers, prices, audiences, features — that aren't in the events. If a note is on a generic heading with no concrete detail captured (e.g. just "Pricing"), explain the CONCEPT in ONE short line ("yahaan pricing plans hain"), never fabricate "from startups to large teams…" detail to fill the budget.

SELECT events are NOT actions:
- A select event = the user highlighted on-screen text for VISUAL emphasis only (pointing with the cursor). Do NOT narrate it as "we select/click X." Ignore it — UNLESS a note covers the same spot, then explain that spot.

ZOOMS = emphasis the editor added:
- A zooms list (below, if present) gives time ranges where the video zooms in. Spend a beat there and, using the events near that timestamp, naturally focus the narration on what's emphasized. Don't announce "we zoom in" — just talk about that element.

VOICE & STYLE — sound like a person, NOT a robot reading a checklist (CRITICAL):
- The #1 failure: narrating every event as "हम X click करते हैं, फिर Y enter करते हैं, फिर Z करते हैं…" — a flat list of "we-do-this, we-do-that". NEVER do this. It is the single biggest thing to avoid.
- NEVER narrate in the first person about your own actions — no "I clicked", "I scrolled", "then I went to…", and no "we click X, then Y, then Z". The viewer sees the clicks. Describe what the PRODUCT/PAGE offers and why it matters, not a play-by-play of cursor moves.
- Narrate the GOAL and the VALUE, not the mechanics. The viewer SEES the clicks on screen — you don't need to announce each one. Say WHY a step matters or WHAT it gets the user, not "we click the button".
  - Robotic (bad): "हम Phone option select करते हैं, number enter करते हैं, verification code भेजते हैं, फिर code enter करते हैं।"
  - Natural (good): "Phone से sign up करना सबसे आसान है, बस number डालो, WhatsApp या SMS पे OTP आता है, और आप अंदर।"
- VARY your sentence openings. Do not start consecutive sentences the same way (no "हम… हम… हम…"). Mix questions, observations, and short remarks.
- COLLAPSE routine multi-step sequences into ONE natural sentence about the outcome (filling a form = "कुछ basic details भर देते हैं, नाम, date of birth, और आप कहाँ से आए", not one line per field).
- Talk like you're showing a friend the product, warm and a little enthusiastic — not a tutorial robot dictating steps.
- The PER-EVENT notes below are for GROUNDING (knowing what truly happened) — they are NOT sentence templates. Never copy their phrasing.

SPEAKABLE TEXT (it is read aloud):
- NEVER include raw URLs/paths, tokens/code identifiers, markdown (**bold**, bullets, ### headings), or imperative command phrasing.
- Say things in words: "the chat page", not "/org/x/chat". Describe the thing, not the string.
- [SECTION] headers in brackets are OK (TTS strips them) — but the prose between them must be flowing, speakable sentences.

TTS / SARVAM VOICE RULES (this is fed to the Sarvam "bulbul" speech engine — write what SOUNDS right, the engine mis-reads certain characters):
- NO hyphens or dashes ANYWHERE in the script. The engine breaks on a number-glued-to-a-word hyphen: "60-day" comes out "sixty… D-A-Y" (it SPELLS the word), "2-Month" / "free-trial" break the same way. This is the single most important TTS rule.
- Write a number + its unit as SEPARATE WORDS, preferring the natural Hindi/spoken word: "60 दिन का free trial" (NOT "60-day"), "2 महीने का trial" (NOT "2-Month"), "₹199 हर month" (NOT "₹199/month" and NOT "199-rupee"). Keep plain digits (the engine says "199", "44", "60" correctly) — just never hyphenate a digit to a word.
- For a PAUSE, use a COMMA or a full stop (Devanagari ।), NEVER an em-dash "—" or a hyphen "-". (e.g. "Phone सबसे आसान है, बस number डालो, OTP आते ही आप अंदर।")
- No slashes between words ("WiFi/SMS", "price/month") — the engine reads "slash". Write "WiFi या SMS", "हर month".
- Spell compound English terms as plain words with a space, never hyphenated: "code mixed", "drop down", "sign up" (two words), "free trial".
- CURRENCY: never write the "₹" symbol — write the amount then the word "रुपये" ("₹199" → "199 रुपये हर month", "₹249/month" → "249 रुपये हर month"). The engine mis-reads "₹".
- BIG NUMBERS: no digit-grouping commas ("1,50,000" is read with "comma"). Say large amounts in Indian words: "डेढ़ लाख", "पचास हज़ार". Keep small counts as plain digits ("44 students", "2 महीने").
- ACRONYMS: keep TRUE acronyms in capitals so the engine spells them right (OTP, SMS, ID, QR) — and keep say-as-a-word terms in normal case (WiFi, Google, Email, dashboard). NEVER UPPERCASE a normal word — an all-caps word gets spelled letter by letter. A screen often shows plan tiers / labels in ALL CAPS (MICRO, SMALL, STANDARD, PRO, BASIC, FREE) — narrate them Title-Case ("Micro", "Pro", "Standard"), NOT "M-I-C-R-O" / "P-R-O".
- DATES & TIMES: never read a raw date/time string (e.g. "2002-06-06", "06/06/2002", "10:30"). If a date matters, say it in words ("जून 2002", "साढ़े दस बजे"). Typed personal data (date of birth, phone) is demo input — don't speak the literal value.

GROUNDING (what each event means — use to KNOW the truth, never as phrasing):
- navigate → a new screen/section; weave it into the flow when the page actually changes.
- click button/link → the user acted on [label]; mention it only if it carries meaning, otherwise fold into the goal.
- input → a field was filled (from meta.placeholder/label); mention the typed value only if it's clearly demo data (never passwords/tokens/cards).
- select → NOT an action (highlight only). Ignore unless a note covers the same spot.
- scroll → only matters if it reveals new content.
- idle → a pause; reflect it only if it's a real wait worth a beat.
- mutate → many sibling nodes appeared/disappeared at once with NO click — meta.added/removed = how many, meta.samples = which (e.g. "A-38 … A-47"), meta.container = where. This has TWO common causes; decide from context, don't assume:
  - The user BUILT something by click+drag (painting a row of seats on a floor-map, etc.) → narrate it as them creating that block ("yahaan ek hi drag mein A-38 se A-47 tak ki poori row ban gayi"). Several mutate events in a row, with seat/cell-like samples (A-38, A-39…), in an editor = the layout built block by block; cover the blocks.
  - Results/options simply RENDERED — e.g. right after an input/search/filter event, or a dropdown/autocomplete opening. samples here look like names/rows, not a created grid. This is NOT a user action; treat like select/scroll — fold into "results appeared" at most, never narrate as "the user built/added" anything.
  When unsure (no preceding drag-y editor context, samples look like search hits), prefer the second reading — do NOT invent a creation the user didn't do.
- Group rapid/repeated events; never narrate them one by one.

OUTPUT: only the narration text (optional [SECTION] headers + prose). No JSON, no timestamps, no SRT, no markdown.
- Output ONLY the spoken words. NEVER include an instruction/reminder/meta-comment to yourself — e.g. "keep it short and natural", "matching the video", "make it engaging". Those are directions, not narration; they would be read aloud. End the script on a real sentence about the product, never on a note-to-self.`;

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

// Parse the editor's `visualContext: [{ tMs, kind, dataUrl }]` (screenshots of
// silent stretches) into base64 frames for the vision model. Drops any entry
// with a bad time or malformed data URL; sorts by time; caps the count.
const VISUAL_DATA_URL_RE = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/;
export type VisualFrame = { tMs: number; kind: "lead-in" | "idle"; mimeType: string; data: string };
export function parseVisualFrames(raw: unknown, max = 8): VisualFrame[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((f): VisualFrame[] => {
      const fr = f as { tMs?: unknown; dataUrl?: unknown; kind?: unknown };
      if (typeof fr?.dataUrl !== "string" || typeof fr?.tMs !== "number") return [];
      const m = VISUAL_DATA_URL_RE.exec(fr.dataUrl);
      if (!m) return [];
      return [{ tMs: fr.tMs, kind: fr.kind === "lead-in" ? "lead-in" : "idle", mimeType: m[1], data: m[2] }];
    })
    .sort((a, b) => a.tMs - b.tMs)
    .slice(0, max);
}

// Screenshots for stretches where the presenter talked with NO captured clicks
// (the recording's lead-in before the extension caught up, or a long idle pause).
// The event list is empty there, so the model must narrate from what's visible.
export function visualContextDirective(gaps: Array<{ tMs: number; kind: "lead-in" | "idle" }>): string {
  if (!gaps.length) return "";
  const fmt = (ms: number) => {
    const s = Math.round(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const lines = gaps
    .slice(0, 8)
    .map(
      (g, i) =>
        `  - Screenshot ${i + 1} = ${fmt(g.tMs)}${g.kind === "lead-in" ? " (video OPENING — presenter talking before any click)" : " (a pause with no clicks)"}`
    )
    .join("\n");
  return (
    `\n\nSILENT STRETCHES — screenshots are attached IN THIS ORDER. These are moments where the presenter talks over the screen with NO captured clicks (nothing in the event list covers them), so narrate them from what is VISIBLE:\n${lines}\n` +
    `Weave each screenshot into the script at its timeline position, in order — the OPENING screenshot is the very start of the video, so narrate it FIRST, before the first event. Describe only what is clearly on screen (headings, numbers, section names). Never invent data that isn't shown.`
  );
}

// Build the language/voice directive appended to the user message.
export function languageDirective(lang?: string, gender?: string): string {
  const g = gender === "male" ? "male" : "female";
  if (lang === "en") {
    const genderNote =
      g === "male"
        ? "Male narrator — slightly more assertive."
        : "Female narrator — warm, welcoming; avoid \"bhai\".";
    return `\n\nWrite the script in clear, conversational, warm ENGLISH. Active voice, short sentences. ${genderNote}`;
  }
  if (lang === "hinglish") {
    // Roman-script Hinglish: spoken Hindi written in LATIN letters, mixed with
    // English. The Sarvam "bulbul" voice reads romanized code-mix natively (it
    // maps to hi-IN), so DO NOT use Devanagari here — write it the way an Indian
    // would casually type a WhatsApp message. This is NOT the same as the "hi"
    // (Devanagari) mode and NOT pure English.
    const genderNote =
      g === "male"
        ? "Male narrator — thoda confident tone (jaise \"hum dekhenge\", \"chaliye\")."
        : "Female narrator — warm, welcoming (jaise \"aaiye dekhte hain\"); \"bhai\" mat use karna.";
    return `\n\nWrite the script in HINGLISH — spoken Hindi in ROMAN/LATIN letters, mixed with English. THIS IS CRITICAL:
- Hindi words in LATIN script, NOT Devanagari (e.g. "yahaan", "kar sakte ho", "sabse aasaan hai", "daalo", "agar", "phir", "aur") — NEVER write Devanagari (कोई हिंदी अक्षर नहीं).
- WRONG (Devanagari — never do this here): "इस video में हम देखेंगे। Phone सबसे fast है।"
- WRONG (too formal / pure English): "In this video we will see. Phone is the fastest option."
- RIGHT (casual Roman Hinglish): "Is video mein hum dekhenge. Phone se sign up sabse aasaan hai, bas number daalo, OTP aate hi aap andar. Agar aapki library pehle se listed hai toh use claim karo, warna nayi add karo."
- Keep English/tech/product words in English as people say them (video, sign up, button, Phone, OTP, Google, Email, plan, dashboard, Library Owner, Start Free Trial, the product name).
- Spoken and casual, like showing a friend — not textbook Hindi, not formal English. Numbers stay as digits.
- Same speakable rules as always: commas for pauses, NO dashes/hyphens, no "₹" symbol (write "199 rupaye"), no slashes between words.
${genderNote}`;
  }
  // Default: Hindi, Devanagari, code-mixed (what the Sarvam Hindi voice wants).
  const genderNote =
    g === "male"
      ? "Male narrator — थोड़ा confident tone (जैसे \"हम देखेंगे\", \"चलिए\")."
      : "Female narrator — warm, welcoming (जैसे \"आइए देखते हैं\"); \"bhai\" मत use करना.";
  return `\n\nWrite the script in HINDI in the DEVANAGARI script (code-mixed). THIS IS CRITICAL AND THE #1 RULE — a script in Roman/Latin Hindi will be REJECTED and regenerated:
- EVERY Hindi word must be in Devanagari — for the ENTIRE script, not just the first sentence. NEVER write Hindi words in Roman/Latin letters (this is the most common failure).
- WRONG (Roman Hindi — never do this): "Is video mein hum dekhenge. Phone sabse fast hai, number daalo, OTP verify, bas. Agar aapki library listed hai to claim karo."
- RIGHT (Devanagari Hindi + Latin only for English/tech terms; commas for pauses, NO dashes): "इस video में हम देखेंगे। Phone सबसे fast है, number डालो, OTP verify करो, बस। अगर आपकी library listed है तो claim करो।"
- ONLY English / technical / product words stay in Latin script (video, signup, button, Phone, OTP, Google, Email, plan, dashboard, Library Owner, Start Free Trial, the product name). EVERYTHING else — हर हिंदी शब्द — in Devanagari.
- Hindi connective/verb/common words like hum→हम, mein→में, hai→है, karte→करते, dekhenge→देखेंगे, sabse→सबसे, daalo→डालो, agar→अगर, phir→फिर, aur→और, choose karo→choose करो — ALWAYS Devanagari, never Roman.
- Spoken/conversational, not textbook. Numbers can stay as digits.
- BEFORE finishing, re-read your script: if you find ANY Hindi word written in Roman/Latin letters, rewrite it in Devanagari. No Roman Hindi anywhere.
${genderNote}`;
}

// Fraction of "letter mass" that is Devanagari vs Latin. A valid code-mixed Hindi
// script is Devanagari-dominant (the connectives/verbs are Hindi) even though it
// carries English product/tech words in Latin; a Roman-Hindi fallback is ~all
// Latin. Ignores digits/punctuation/spaces.
export function devanagariRatio(text: string): number {
  const dev = (text.match(/[ऀ-ॿ]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const total = dev + latin;
  return total === 0 ? 1 : dev / total;
}

// A lang=hi script that came back mostly in Roman/Latin Hindi (the model ignored
// the Devanagari rule). Threshold 0.2: a real Devanagari code-mix sits well above
// it (~0.4–0.7); a Roman fallback sits near 0. Only meaningful for Hindi.
export function isRomanHindiFallback(script: string, lang?: string): boolean {
  // "en" and "hinglish" are SUPPOSED to be Latin-script — never force them to
  // Devanagari. The guard only applies to the Devanagari "hi" (default) mode.
  if (lang === "en" || lang === "hinglish") return false;
  return devanagariRatio(script) < 0.2;
}

// The follow-up turn that forces a Roman-Hindi script back into Devanagari,
// preserving the wording (and the dash/currency/acronym rules) verbatim.
export const DEVANAGARI_FIX_INSTRUCTION =
  "That script is written in Roman/Latin Hindi. Rewrite the SAME script word-for-word, " +
  "but put EVERY Hindi word in Devanagari script. Keep English/tech/product words in Latin " +
  '(Phone, OTP, Google, Email, dashboard, the product name). Keep commas for pauses — no dashes, ' +
  'no "₹" symbol, no hyphenated number-units. Output ONLY the rewritten script, nothing else.';
