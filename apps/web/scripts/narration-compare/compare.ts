/**
 * Narration model comparison harness (throwaway / experiment).
 *
 * Feeds ONE captured event log through the EXACT production narration prompt
 * (SCRIPT_SYSTEM_PROMPT + buildScriptContext + recordingContext +
 * languageDirective — unchanged) to three models and writes their scripts
 * side by side so we can pick the best generator:
 *   - Gemini   gemini-2.5-pro        (GOOGLE_AI_API_KEY)
 *   - DeepSeek deepseek-v4-pro       (DEEPSEEK_API_KEY)
 *   - Kimi     kimi-k2-0905-preview  (KIMI_API_KEY, api.moonshot.ai/v1)
 *
 * The prompt is NOT modified — same system + user message every model sees,
 * so the only variable is the model. A provider with no key is skipped.
 *
 * Run from repo root:
 *   bun apps/web/scripts/narration-compare/compare.ts
 *   bun apps/web/scripts/narration-compare/compare.ts --lang en --gender male
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  SCRIPT_SYSTEM_PROMPT,
  recordingContext,
  languageDirective,
  devanagariRatio,
} from "../../lib/narration/prompt";
import { buildScriptContext } from "../../lib/narration/events-context";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, "fixtures", "abhyasika-onboarding.log");
const OUT_DIR = join(HERE, "outputs");

// ── CLI args (sensible defaults; lang omitted → Hindi/Devanagari = prod default) ─
const argv = process.argv.slice(2);
const getArg = (flag: string) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};
const lang = getArg("--lang"); // "en" | undefined(=hi)
const gender = getArg("--gender") ?? "female"; // "male" | "female"
const durationSec = Number(getArg("--duration") ?? 204); // 3m24s log

// ── Parse the human-readable event log back into the structured event shape ─────
interface Ev {
  type: string;
  t: number;
  label?: string;
  url?: string;
  preview?: string;
  meta?: Record<string, unknown>;
}

// "[1m05s]" → 65000 ; "[42s]" → 42000
function parseT(stamp: string): number {
  const m = stamp.match(/(?:(\d+)m)?(\d+)s/);
  if (!m) return 0;
  return ((Number(m[1] ?? 0) * 60 + Number(m[2])) * 1000) | 0;
}

// keys that stay at the top level of the event; everything else → meta.*
const TOP_LEVEL = new Set(["url"]);

function parseLog(raw: string): { events: Ev[]; noteAnswers: { label: string; answer: string }[] } {
  const lines = raw.split("\n");
  const events: Ev[] = [];
  const noteAnswers: { label: string; answer: string }[] = [];
  let cur: Ev | null = null;
  let curNote: string | null = null;

  const header = /^\s*\d+\.\s*\[([^\]]+)\]\s*([A-Z]+):?\s*(.*)$/;

  const flush = () => {
    if (!cur) return;
    if (cur.type === "note") {
      // answer = what the user marked to explain (the NOTE string);
      // label = the element under the cursor (its text), for noteSection.
      const elText =
        (cur.meta?.text as string) || (cur.meta?.fullText as string) || cur.label || "";
      noteAnswers.push({ label: String(elText).slice(0, 80), answer: curNote ?? cur.label ?? "" });
    }
    events.push(cur);
    cur = null;
    curNote = null;
  };

  for (const line of lines) {
    const h = header.exec(line);
    if (h) {
      flush();
      const [, stamp, TYPE, rest] = h;
      const type = TYPE.toLowerCase();
      cur = { type, t: parseT(stamp), meta: {} };
      const tail = rest.trim();
      if (type === "input") {
        cur.preview = tail.replace(/^"|"$/g, "");
        cur.label = cur.preview;
      } else if (type === "note") {
        curNote = tail.replace(/^"|"$/g, "");
        cur.label = curNote;
      } else if (tail) {
        cur.label = tail;
      }
      continue;
    }
    // indented "key: value" sub-line of the current event
    const kv = line.match(/^\s{4,}([a-zA-Z]+):\s?(.*)$/);
    if (kv && cur) {
      const [, key, value] = kv;
      if (TOP_LEVEL.has(key)) {
        (cur as unknown as Record<string, unknown>)[key] = value;
      } else {
        cur.meta![key] = value;
      }
    }
  }
  flush();
  return { events, noteAnswers };
}

// ── Build the EXACT production user message ─────────────────────────────────────
function buildMessages() {
  const raw = readFileSync(FIXTURE, "utf8");
  const { events, noteAnswers } = parseLog(raw);
  const { eventsJson, appLine, appName } = buildScriptContext(events);

  const noteSection = noteAnswers.length
    ? `\n\nWhat the user wants explained at each shift-marked spot (USE these — explain exactly this at that element):\n${noteAnswers
        .filter((n) => n.answer?.trim())
        .map((n) => `- "${n.label}": ${n.answer}`)
        .join("\n")}`
    : "";

  const userContent = `Generate a narration script for this screen recording.\n\nEvents:\n${eventsJson}${appLine}${noteSection}${recordingContext(durationSec)}${languageDirective(lang, gender)}`;

  return {
    system: SCRIPT_SYSTEM_PROMPT,
    user: userContent,
    appName,
    eventCount: events.length,
    noteCount: noteAnswers.length,
  };
}

// ── Providers (inline; no fallback — we want the exact model's raw output) ──────
async function callOpenAICompat(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  user: string,
  maxTokens: number
): Promise<string> {
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("empty content");
  return text;
}

async function callGemini(
  apiKey: string,
  model: string,
  system: string,
  user: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const m = genAI.getGenerativeModel({
    model,
    systemInstruction: system,
    generationConfig: { maxOutputTokens: 8192, temperature: 0.7 },
  });
  const result = await m.generateContent(user);
  const text = result.response.text().trim();
  if (!text) throw new Error("empty content");
  return text;
}

interface Provider {
  key: string;
  model: string;
  run: (system: string, user: string) => Promise<string>;
  available: boolean;
}

const providers: Provider[] = [
  {
    key: "gemini",
    model: "gemini-2.5-pro",
    available: !!process.env.GOOGLE_AI_API_KEY,
    run: (s, u) => callGemini(process.env.GOOGLE_AI_API_KEY!, "gemini-2.5-pro", s, u),
  },
  {
    key: "deepseek",
    model: "deepseek-v4-pro",
    available: !!process.env.DEEPSEEK_API_KEY,
    run: (s, u) =>
      callOpenAICompat(
        "https://api.deepseek.com/chat/completions",
        process.env.DEEPSEEK_API_KEY!,
        "deepseek-v4-pro",
        s,
        u,
        8192
      ),
  },
  {
    key: "kimi",
    model: "kimi-k2-0905-preview",
    available: !!process.env.KIMI_API_KEY,
    run: (s, u) =>
      callOpenAICompat(
        "https://api.moonshot.ai/v1/chat/completions",
        process.env.KIMI_API_KEY!,
        "kimi-k2-0905-preview",
        s,
        u,
        4096
      ),
  },
];

// ── Run ─────────────────────────────────────────────────────────────────────
async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const { system, user, appName, eventCount, noteCount } = buildMessages();

  console.log(`\nInput: ${eventCount} events, ${noteCount} notes, app="${appName}"`);
  console.log(`lang=${lang ?? "hi (default)"} gender=${gender} duration=${durationSec}s`);
  console.log(`prompt: ${(system.length + user.length).toLocaleString()} chars\n`);
  writeFileSync(join(OUT_DIR, "_user-message.txt"), user, "utf8");

  const rows: string[] = [];
  for (const p of providers) {
    if (!p.available) {
      console.log(`⊘ ${p.key.padEnd(9)} ${p.model} — SKIPPED (no API key in env)`);
      rows.push(`| ${p.key} | ${p.model} | — | — | **no key** |`);
      continue;
    }
    const started = Date.now();
    try {
      const script = await p.run(system, user);
      const ms = Date.now() - started;
      const ratio = devanagariRatio(script);
      const words = script.split(/\s+/).filter(Boolean).length;
      writeFileSync(join(OUT_DIR, `${p.key}.txt`), script, "utf8");
      console.log(
        `✓ ${p.key.padEnd(9)} ${p.model} — ${(ms / 1000).toFixed(1)}s, ${script.length} chars, ${words} words, devanagari ${(ratio * 100).toFixed(0)}%`
      );
      rows.push(
        `| ${p.key} | ${p.model} | ${(ms / 1000).toFixed(1)}s | ${words}w / ${script.length}c | dev ${(ratio * 100).toFixed(0)}% |`
      );
    } catch (err) {
      const ms = Date.now() - started;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗ ${p.key.padEnd(9)} ${p.model} — FAILED after ${(ms / 1000).toFixed(1)}s: ${msg}`);
      rows.push(`| ${p.key} | ${p.model} | ${(ms / 1000).toFixed(1)}s | — | **error**: ${msg} |`);
    }
  }

  const summary = `# Narration model comparison\n\nInput: ${eventCount} events, ${noteCount} notes, app="${appName}", lang=${lang ?? "hi"}, gender=${gender}, target ${durationSec}s.\n\n| model | id | latency | length | notes |\n|---|---|---|---|---|\n${rows.join("\n")}\n\nScripts: see \`outputs/<model>.txt\`. Identical prompt fed to all (see \`outputs/_user-message.txt\`).\n`;
  writeFileSync(join(OUT_DIR, "comparison.md"), summary, "utf8");
  console.log(`\nWrote outputs/ (scripts + comparison.md)\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
