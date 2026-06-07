export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deepseekChat } from "@/lib/deepseek/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const SCRIPT_SYSTEM_PROMPT = `You generate complete, natural voiceover narration scripts for screen-recording videos. The script is read aloud by a text-to-speech engine, so it must SOUND like a real person talking — never a robot reading labels.

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
- A note event = the user HELD SHIFT (often moving the cursor to point) to say "EXPLAIN THIS." These are the ONLY places to slow down and explain in depth: what the element is, what it does, why it matters. Bigger durationMs = more important.
- Never skip a note. Everything between notes is connective tissue — keep it short.

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

interface ZoomCtx {
  startMs: number;
  endMs: number;
  depth?: number;
  cx?: number;
  cy?: number;
}

// Build the duration + word-budget + zoom context appended to the user message.
function recordingContext(durationSec?: number, zooms?: ZoomCtx[]): string {
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
function languageDirective(lang?: string, gender?: string): string {
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
- Natural code-mixing, exactly how people speak. Reference style: "नमस्ते! इस video में हम देखेंगे कि signup कैसे करते हैं। सबसे पहले हम "Sign Up Free" button पर click करते हैं…"
- Spoken/conversational Hindi, not textbook. Numbers can stay as digits.
${genderNote}`;
}


type RouteParams = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const session = await prisma.captureSession.findUnique({
      where: { id },
      select: { id: true, events: true, script: true, createdAt: true, expiresAt: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    if (session.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "Session expired" },
        { status: 410, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, data: session },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const { lang, gender, durationSec, zooms } = (await req.json().catch(() => ({}))) as {
      lang?: string;
      gender?: string;
      durationSec?: number;
      zooms?: ZoomCtx[];
    };
    const session = await prisma.captureSession.findUnique({
      where: { id },
      select: { id: true, events: true, meta: true, expiresAt: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    if (session.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "Session expired" },
        { status: 410, headers: CORS_HEADERS }
      );
    }

    const eventsJson = JSON.stringify(session.events, null, 2);
    const metaSection = session.meta
      ? `\n\nRecording metadata (cuts made in Recordly):\n${JSON.stringify(session.meta, null, 2)}`
      : "";

    const script = await deepseekChat({
      maxTokens: 2048,
      messages: [
        { role: "system", content: SCRIPT_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Generate a narration script for this screen recording.\n\nEvents:\n${eventsJson}${metaSection}${recordingContext(durationSec, zooms)}${languageDirective(lang, gender)}`,
        },
      ],
    });

    await prisma.captureSession.update({
      where: { id },
      data: { script },
    });

    return NextResponse.json(
      { success: true, data: { script } },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
