// Paragraph-merge tests — run with: bun test merge-edit.test.ts
//
// These carry the LOAD-BEARING guarantee of the whole partial-refine feature:
// editing one paragraph leaves every other paragraph BYTE-IDENTICAL. The proof
// lives here (deterministic), not in the real-Gemini test — model output varies,
// but the merge must never drift.
import { describe, expect, it } from "bun:test";
import {
  splitParagraphs,
  numberParagraphs,
  parseParagraphPatch,
  mergeParagraphEdit,
} from "./merge-edit";

// A realistic 4-paragraph script with [SECTION] headers + Hinglish prose.
const SCRIPT = `[Intro]
मिलिए My Abhyasika से, आपका study room partner.

[Sign up]
यहाँ teen तरीके से sign up कर सकते हो, Google से, Phone OTP से, या Email से.

[Floor map editor]
अब layout banाते हैं. पहले select और erase tools dekho.

[Pricing]
यहाँ pricing plans हैं, हर month 199 रुपये से.`;

describe("splitParagraphs", () => {
  it("splits on blank lines and is stable across a round-trip", () => {
    const paras = splitParagraphs(SCRIPT);
    expect(paras).toHaveLength(4);
    expect(paras.join("\n\n")).toBe(SCRIPT);
  });

  it("collapses 3+ blank lines and trims, then is stable", () => {
    const messy = "one\n\n\n\ntwo\n\n  ";
    const re = splitParagraphs(messy).join("\n\n");
    expect(re).toBe("one\n\ntwo");
    // feeding the normalized form back in is idempotent
    expect(splitParagraphs(re).join("\n\n")).toBe(re);
  });

  it("returns [] for empty / whitespace", () => {
    expect(splitParagraphs("")).toEqual([]);
    expect(splitParagraphs("   \n\n ")).toEqual([]);
  });
});

describe("numberParagraphs", () => {
  it("prefixes each paragraph with its [#n] address", () => {
    const numbered = numberParagraphs(SCRIPT);
    expect(numbered).toContain("[#0]\n[Intro]");
    expect(numbered).toContain("[#2]\n[Floor map editor]");
    expect(numbered).toContain("[#3]\n[Pricing]");
  });
});

describe("parseParagraphPatch", () => {
  it("returns null when no [#n] address is present (→ full-replace fallback)", () => {
    expect(parseParagraphPatch("just a whole new script body")).toBeNull();
  });

  it("parses a single changed block", () => {
    const ops = parseParagraphPatch("[#2]\nnew floor map text");
    expect(ops).not.toBeNull();
    expect(ops?.get(2)).toBe("new floor map text");
    expect(ops?.size).toBe(1);
  });

  it("parses multiple blocks and keeps internal blank lines (expansion)", () => {
    const ops = parseParagraphPatch("[#1]\nline a\n\nline b\n[#3]\npricing redo");
    expect(ops?.get(1)).toBe("line a\n\nline b");
    expect(ops?.get(3)).toBe("pricing redo");
  });

  it("treats an empty block as a deletion (empty string)", () => {
    const ops = parseParagraphPatch("[#2]\n");
    expect(ops?.get(2)).toBe("");
  });

  it("tolerates spaced address drift like [ # 2 ]", () => {
    const ops = parseParagraphPatch("[ # 2 ]\nrewritten");
    expect(ops?.get(2)).toBe("rewritten");
  });
});

describe("mergeParagraphEdit — THE GUARANTEE", () => {
  it("editing a later paragraph leaves earlier paragraphs byte-identical", () => {
    const original = splitParagraphs(SCRIPT);
    const ops = parseParagraphPatch(
      "[#2]\n[Floor map editor]\nपहले select, erase, और direction tools. फिर undo redo. फिर पूरा layout drag से banाते हैं, 82 seats.",
    );
    if (!ops) throw new Error("expected a patch");
    const merged = mergeParagraphEdit(SCRIPT, ops);
    const after = splitParagraphs(merged);

    // earlier paragraphs (0,1) — untouched, exact bytes
    expect(after[0]).toBe(original[0]);
    expect(after[1]).toBe(original[1]);
    // later paragraph (3) — untouched, exact bytes
    expect(after[3]).toBe(original[3]);
    // targeted paragraph (2) — changed
    expect(after[2]).not.toBe(original[2]);
    expect(after[2]).toContain("82 seats");
  });

  it("expanding one paragraph into several does not shift other paragraphs", () => {
    const ops = parseParagraphPatch("[#2]\npart one of the editor.\n\npart two of the editor.");
    if (!ops) throw new Error("expected a patch");
    const merged = mergeParagraphEdit(SCRIPT, ops);
    const after = splitParagraphs(merged);
    expect(after).toHaveLength(5); // 4 → 5 (one split into two)
    expect(after[0]).toBe("[Intro]\nमिलिए My Abhyasika से, आपका study room partner.");
    expect(after[after.length - 1]).toContain("[Pricing]"); // pricing still last, intact
  });

  it("deleting a paragraph removes only it", () => {
    const ops = parseParagraphPatch("[#1]\n");
    if (!ops) throw new Error("expected a patch");
    const merged = mergeParagraphEdit(SCRIPT, ops);
    const after = splitParagraphs(merged);
    expect(after).toHaveLength(3);
    expect(merged).not.toContain("teen तरीके");
    expect(merged).toContain("[Floor map editor]");
  });

  it("ignores out-of-range indices instead of throwing", () => {
    const ops = parseParagraphPatch("[#99]\nstray");
    if (!ops) throw new Error("expected a patch");
    const merged = mergeParagraphEdit(SCRIPT, ops);
    expect(merged).toBe(SCRIPT); // no in-range edit → unchanged
  });
});
