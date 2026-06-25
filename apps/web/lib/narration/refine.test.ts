// Refine-pipeline tests — run with: bun test lib/narration/refine.test.ts
//
// Two layers:
//  1. resolveRefinement (pure, always runs) — the three model-output paths.
//  2. A REAL Gemini integration test (gated on GEMINI_API_KEY) — proves the
//     prompt actually makes gemini-2.5-pro emit a partial [#n] edit so untouched
//     paragraphs survive. Sarvam (TTS) is irrelevant to text refinement, so this
//     test is Gemini-only by design.
//
// The integration test is GATED + kept out of the default CI lane (live network,
// non-deterministic, ~20s). Run it explicitly with GEMINI_API_KEY set.
import { describe, expect, it } from "bun:test";
import {
  resolveRefinement,
  buildRefineSystem,
  buildRefineContextTurn,
} from "./refine";
import { splitParagraphs } from "./merge-edit";
import { buildScriptContext } from "./events-context";
import { geminiChat } from "../gemini/client";

const SCRIPT = `[Intro]
मिलिए My Abhyasika से, आपका study room partner.

[Sign up]
यहाँ teen तरीके से sign up कर सकते हो, Google से, Phone OTP से, या Email से.

[Floor map editor]
अब layout banाते हैं. select, erase, direction, undo redo tools का इस्तेमाल करके पूरा 82 seats का layout drag से banाते हैं.

[Pricing]
यहाँ pricing plans हैं, हर month 199 रुपये से.`;

describe("resolveRefinement (pure)", () => {
  it("no ---SCRIPT--- marker → clarifying question, script null", () => {
    const r = resolveRefinement("Which button do you mean?", SCRIPT);
    expect(r.script).toBeNull();
    expect(r.reply).toContain("Which button");
  });

  it("marker + [#n] block → surgical merge, untouched paragraphs byte-identical", () => {
    const raw = "Shortened the floor map part.\n---SCRIPT---\n[#2]\n[Floor map editor]\nLayout banana easy hai.";
    const orig = splitParagraphs(SCRIPT);
    const r = resolveRefinement(raw, SCRIPT);
    const after = splitParagraphs(r.script!);
    expect(after[0]).toBe(orig[0]);
    expect(after[1]).toBe(orig[1]);
    expect(after[3]).toBe(orig[3]);
    expect(after[2]).toBe("[Floor map editor]\nLayout banana easy hai.");
  });

  it("marker but NO [#n] block → whole-script replace (back-compat)", () => {
    const raw = "Rewrote it.\n---SCRIPT---\nA brand new full script.";
    const r = resolveRefinement(raw, SCRIPT);
    expect(r.script).toBe("A brand new full script.");
  });
});

// ---- Real Gemini integration (gated) ----
const hasKey = !!process.env.GEMINI_API_KEY;
const events = [
  { type: "navigate", t: 0, label: "My Abhyasika", url: "https://myabhyasika.com/", meta: { text: "study room partner" } },
  { type: "click", t: 5000, label: "Sign up", meta: { role: "button" } },
  { type: "note", t: 30000, label: "Floor map editor", meta: { section: "editor" } },
  { type: "click", t: 60000, label: "Pricing", meta: { text: "199" } },
];

describe.skipIf(!hasKey)("refine pipeline — real Gemini", () => {
  it(
    "editing the floor map part leaves the other paragraphs byte-identical",
    async () => {
      const { eventsJson, appLine } = buildScriptContext(events);
      const system = buildRefineSystem({ lang: "hinglish", gender: "female", durationSec: 75 });
      const contextTurn = buildRefineContextTurn({
        eventsJson,
        appLine,
        metaSection: "",
        currentScript: SCRIPT,
      });
      const raw = await geminiChat({
        model: "gemini-2.5-pro",
        messages: [
          { role: "system", content: system },
          { role: "user", content: contextTurn },
          { role: "assistant", content: SCRIPT },
          {
            role: "user",
            content:
              "Make ONLY the Floor map editor part shorter and snappier. Do not touch the Intro, Sign up, or Pricing paragraphs at all.",
          },
        ],
      });

      const r = resolveRefinement(raw, SCRIPT);
      expect(r.script).not.toBeNull();

      const orig = splitParagraphs(SCRIPT);
      const after = splitParagraphs(r.script!);

      // The guarantee: Intro, Sign up, Pricing survive byte-for-byte.
      expect(after).toContain(orig[0]); // [Intro]
      expect(after).toContain(orig[1]); // [Sign up]
      expect(after).toContain(orig[3]); // [Pricing]
      // And the floor map paragraph actually changed.
      expect(after).not.toContain(orig[2]);
    },
    60_000,
  );
});
