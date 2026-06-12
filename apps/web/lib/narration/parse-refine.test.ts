// Refine-reply parser tests — run with: bun test parse-refine.test.ts
//
// Each `it` that starts with "BUG:" is a reproduction scenario: the literal
// model output that broke production, captured so the fix can never silently
// regress. See parse-refine.ts for the failure history.
import { describe, expect, it } from "bun:test";
import { parseRefineReply } from "./parse-refine";

describe("parseRefineReply", () => {
  it("extracts script after the canonical ---SCRIPT--- marker", () => {
    const { reply, script } = parseRefineReply(
      "Added the Google/Email/Phone options.\n---SCRIPT---\nमिलिए My Abhyasika से — आपका study room partner.",
    );
    expect(reply).toBe("Added the Google/Email/Phone options.");
    expect(script).toBe("मिलिए My Abhyasika से — आपका study room partner.");
  });

  // The exact failure from the editor screenshot: the model broke the delimiter
  // across lines (`---` then a blank line then `SCRIPT---`). The old
  // indexOf("---SCRIPT---") returned -1 → script=null → no "Apply to script"
  // button → the user could not apply the refined script.
  it("BUG: delimiter split across lines (---\\n\\nSCRIPT---)", () => {
    const raw =
      'ज़रूर, मैं signup form पर Google, Email और Phone का विकल्प जोड़ रहा हूँ।\n\n---\n\nSCRIPT---\n\nमिलिए My Abhyasika से — आपका study room partner, जहाँ...';
    const { reply, script } = parseRefineReply(raw);
    expect(script).not.toBeNull();
    expect(script).toContain("मिलिए My Abhyasika से");
    expect(reply).toContain("signup form");
    expect(reply).not.toContain("SCRIPT");
  });

  it("BUG: padded marker (--- SCRIPT ---)", () => {
    const { script } = parseRefineReply("One line.\n--- SCRIPT ---\nThe revised script.");
    expect(script).toBe("The revised script.");
  });

  it("BUG: lowercased marker (---script---)", () => {
    const { script } = parseRefineReply("ok\n---script---\nbody");
    expect(script).toBe("body");
  });

  it("BUG: varied dash count (----SCRIPT----)", () => {
    const { script } = parseRefineReply("ok\n----SCRIPT----\nbody");
    expect(script).toBe("body");
  });

  it("returns null script when the model only asks a clarifying question", () => {
    const raw = "Which button do you mean — the top one or the sticky CTA?";
    const { reply, script } = parseRefineReply(raw);
    expect(script).toBeNull();
    expect(reply).toBe(raw);
  });

  it("does not treat a plain horizontal rule (---) as the marker", () => {
    const raw = "Here is some prose.\n---\nMore prose, no script keyword.";
    const { script } = parseRefineReply(raw);
    expect(script).toBeNull();
  });
});
