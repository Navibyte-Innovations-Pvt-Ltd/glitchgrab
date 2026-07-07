// Lane-1 unit tests for the silent-stretch visual context: frame parsing +
// the directive that tells the model to narrate screens with no captured clicks.
import { describe, expect, it } from "bun:test";
import { parseVisualFrames, visualContextDirective } from "./prompt";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANS=";
const JPG = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

describe("parseVisualFrames", () => {
  it("returns [] for non-arrays / junk", () => {
    expect(parseVisualFrames(undefined)).toEqual([]);
    expect(parseVisualFrames(null)).toEqual([]);
    expect(parseVisualFrames("nope")).toEqual([]);
  });

  it("parses valid frames, splitting the data URL into mime + base64", () => {
    const out = parseVisualFrames([{ tMs: 0, kind: "lead-in", dataUrl: PNG }]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ tMs: 0, kind: "lead-in", mimeType: "image/png" });
    expect(out[0].data).toBe("iVBORw0KGgoAAAANS=");
  });

  it("drops entries with a bad time or malformed data URL", () => {
    const out = parseVisualFrames([
      { tMs: 0, dataUrl: PNG },
      { tMs: "nope", dataUrl: PNG }, // bad time
      { tMs: 1000, dataUrl: "data:text/plain;base64,AAAA" }, // not an image
      { tMs: 2000 }, // no dataUrl
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].tMs).toBe(0);
  });

  it("defaults an unknown kind to 'idle' and sorts by time", () => {
    const out = parseVisualFrames([
      { tMs: 5000, dataUrl: JPG },
      { tMs: 1000, kind: "weird", dataUrl: PNG },
    ]);
    expect(out.map((f) => f.tMs)).toEqual([1000, 5000]);
    expect(out[0].kind).toBe("idle");
  });

  it("caps the number of frames", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ tMs: i * 1000, dataUrl: PNG }));
    expect(parseVisualFrames(many, 8)).toHaveLength(8);
  });
});

describe("visualContextDirective", () => {
  it("is empty when there are no gaps", () => {
    expect(visualContextDirective([])).toBe("");
  });

  it("labels the lead-in as the opening and lists gaps in mm:ss", () => {
    const d = visualContextDirective([
      { tMs: 27500, kind: "lead-in" },
      { tMs: 90000, kind: "idle" },
    ]);
    expect(d).toContain("Screenshot 1 = 0:28"); // 27500ms → round → 28s
    expect(d).toContain("OPENING");
    expect(d).toContain("Screenshot 2 = 1:30");
    expect(d).toContain("narrate it FIRST");
    // Anti-hallucination guardrail is present.
    expect(d.toLowerCase()).toContain("never invent");
  });

  it("labels a trailing gap as the ENDING and tells the model to narrate it last", () => {
    const d = visualContextDirective([
      { tMs: 369000, kind: "idle" },
      { tMs: 496000, kind: "trailing" },
    ]);
    expect(d).toContain("ENDING");
    expect(d).toContain("narrate it LAST");
    expect(d).toContain("video keeps going");
  });
});
