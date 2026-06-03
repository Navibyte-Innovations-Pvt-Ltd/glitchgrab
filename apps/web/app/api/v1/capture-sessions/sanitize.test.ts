// Web API event sanitizer tests — run with: bun test sanitize.test.ts
import { describe, expect, it } from "bun:test";
import { sanitizeEvents, sanitizeMeta, MAX_EVENTS, MAX_EVENT_LABEL_LEN } from "./sanitize";

describe("sanitizeEvents", () => {
  it("keeps valid fields incl. preview and meta", () => {
    const [e] = sanitizeEvents([
      {
        type: "click",
        t: 1234,
        label: "Get Early Access",
        tag: "button",
        url: "http://localhost:3000/",
        preview: "hello@x.com",
        meta: { role: "button", icon: "svg:share" },
      },
    ]);
    expect(e.type).toBe("click");
    expect(e.t).toBe(1234);
    expect(e.label).toBe("Get Early Access");
    expect(e.preview).toBe("hello@x.com");
    expect(e.meta).toEqual({ role: "button", icon: "svg:share" });
  });

  it("returns [] for non-array input", () => {
    expect(sanitizeEvents(null)).toEqual([]);
    expect(sanitizeEvents("nope")).toEqual([]);
    expect(sanitizeEvents({})).toEqual([]);
  });

  it("drops null / non-object entries", () => {
    const out = sanitizeEvents([null, 42, "x", { type: "click", t: 1 }]);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe("click");
  });

  it("caps the array at MAX_EVENTS", () => {
    const huge = Array.from({ length: MAX_EVENTS + 500 }, (_, i) => ({ type: "click", t: i }));
    expect(sanitizeEvents(huge)).toHaveLength(MAX_EVENTS);
  });

  it("bounds label length and floors/clamps t", () => {
    const [e] = sanitizeEvents([{ type: "click", t: -5.9, label: "x".repeat(500) }]);
    expect(e.label?.length).toBe(MAX_EVENT_LABEL_LEN);
    expect(e.t).toBe(0); // negative clamped to 0
  });

  it("coerces a missing type to 'unknown' and missing t to 0", () => {
    const [e] = sanitizeEvents([{ label: "no type" }]);
    expect(e.type).toBe("unknown");
    expect(e.t).toBe(0);
  });

  it("drops non-string optional fields", () => {
    const [e] = sanitizeEvents([{ type: "click", t: 1, label: 123, url: {}, preview: [] }]);
    expect(e.label).toBeUndefined();
    expect(e.url).toBeUndefined();
    expect(e.preview).toBeUndefined();
  });
});

describe("sanitizeMeta", () => {
  it("returns undefined for non-objects / empty", () => {
    expect(sanitizeMeta(null)).toBeUndefined();
    expect(sanitizeMeta("x")).toBeUndefined();
    expect(sanitizeMeta({})).toBeUndefined();
  });

  it("keeps only string values, bounds value length", () => {
    const m = sanitizeMeta({ role: "button", count: 5, big: "y".repeat(400) });
    expect(m?.role).toBe("button");
    expect(m?.count).toBeUndefined(); // non-string dropped
    expect(m?.big.length).toBe(250);
  });

  it("caps at 20 keys", () => {
    const raw: Record<string, string> = {};
    for (let i = 0; i < 40; i++) raw[`k${i}`] = "v";
    expect(Object.keys(sanitizeMeta(raw) ?? {}).length).toBe(20);
  });
});
