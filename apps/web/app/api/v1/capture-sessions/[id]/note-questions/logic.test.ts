// Note-questions vision-pass logic tests — run with: bun test logic.test.ts
import { describe, expect, it } from "bun:test";
import {
  parseFrames,
  resolveVisionQuestions,
  DEFAULT_NOTE_OPTIONS,
} from "./logic";

// A 1x1 transparent PNG, enough to exercise the data-URL parser.
const PNG_1PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";

describe("parseFrames", () => {
  it("parses valid frames, stripping the data-URL prefix", () => {
    const out = parseFrames([{ id: "group-0", dataUrl: PNG_1PX }]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("group-0");
    expect(out[0].mimeType).toBe("image/png");
    // base64 only — no "data:..." prefix survives (Gemini inlineData wants raw).
    expect(out[0].data.startsWith("data:")).toBe(false);
    expect(out[0].data).toBe(PNG_1PX.split(",")[1]);
  });

  it("parses a jpeg data URL", () => {
    const out = parseFrames([{ id: "g", dataUrl: "data:image/jpeg;base64,QUJD" }]);
    expect(out).toEqual([{ id: "g", mimeType: "image/jpeg", data: "QUJD" }]);
  });

  it("returns [] for non-array input (junk body → text pass)", () => {
    expect(parseFrames(null)).toEqual([]);
    expect(parseFrames(undefined)).toEqual([]);
    expect(parseFrames("nope")).toEqual([]);
    expect(parseFrames({})).toEqual([]);
  });

  it("drops entries with missing/invalid id or dataUrl", () => {
    const out = parseFrames([
      { dataUrl: PNG_1PX }, // no id
      { id: "x" }, // no dataUrl
      { id: 5, dataUrl: PNG_1PX }, // non-string id
      { id: "ok", dataUrl: PNG_1PX }, // valid
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("ok");
  });

  it("drops non-image and prefix-less data URLs", () => {
    const out = parseFrames([
      { id: "a", dataUrl: "data:text/plain;base64,QUJD" }, // not an image
      { id: "b", dataUrl: "QUJDno-prefix" }, // no data: prefix
      { id: "c", dataUrl: "data:image/png;base64," }, // empty payload
    ]);
    expect(out).toEqual([]);
  });
});

describe("resolveVisionQuestions", () => {
  const framed = [
    { id: "group-0", tMs: 9000, label: "Google, Phone, Email" },
    { id: "group-1", tMs: 25000, label: "Student, Library Owner" },
  ];

  it("drops a group vision positively cleared (clear:true)", () => {
    const out = resolveVisionQuestions(framed, [
      { id: "group-0", clear: true },
      { id: "group-1", clear: false, question: "Explain the two roles?", options: ["a", "b", "c"] },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("group-1");
    expect(out[0].question).toBe("Explain the two roles?");
    expect(out[0].options).toEqual(["a", "b", "c"]);
  });

  it("KEEPS a group with no verdict (model failed/omitted it) — never swallowed", () => {
    const out = resolveVisionQuestions(framed, [{ id: "group-0", clear: true }]);
    // group-1 has no verdict → still surfaces with default question/options.
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("group-1");
    expect(out[0].question).toBe("What do you want to explain about Student, Library Owner?");
    expect(out[0].options).toEqual(DEFAULT_NOTE_OPTIONS);
  });

  it("vision total failure (no verdicts) keeps EVERY framed group", () => {
    const out = resolveVisionQuestions(framed, []);
    expect(out).toHaveLength(2);
    expect(out.map((q) => q.id)).toEqual(["group-0", "group-1"]);
  });

  it("falls back to defaults when options aren't exactly 3", () => {
    const out = resolveVisionQuestions([framed[0]], [
      { id: "group-0", clear: false, question: "Q?", options: ["only-one"] },
    ]);
    expect(out[0].options).toEqual(DEFAULT_NOTE_OPTIONS);
  });

  it("returns [] when every framed group is cleared", () => {
    const out = resolveVisionQuestions(framed, [
      { id: "group-0", clear: true },
      { id: "group-1", clear: true },
    ]);
    expect(out).toEqual([]);
  });
});
