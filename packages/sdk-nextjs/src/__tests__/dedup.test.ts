import { beforeEach, describe, expect, it } from "vitest";
import {
  computeSignature,
  shouldSkipDuplicate,
  clearDedupCache,
} from "../dedup";

describe("computeSignature", () => {
  it("returns same hash for identical inputs", () => {
    const a = computeSignature({
      errorMessage: "Failed to fetch",
      pageUrl: "https://app.example.com/dashboard",
      errorStack: "Error: Failed to fetch\n    at fetch (app.js:1:1)",
    });
    const b = computeSignature({
      errorMessage: "Failed to fetch",
      pageUrl: "https://app.example.com/dashboard",
      errorStack: "Error: Failed to fetch\n    at fetch (app.js:1:1)",
    });
    expect(a).toBe(b);
  });

  it("ignores query string in pageUrl", () => {
    const a = computeSignature({
      errorMessage: "Failed to fetch",
      pageUrl: "https://app.example.com/dashboard?foo=1",
    });
    const b = computeSignature({
      errorMessage: "Failed to fetch",
      pageUrl: "https://app.example.com/dashboard?foo=2&bar=3",
    });
    expect(a).toBe(b);
  });

  it("differs when errorMessage differs", () => {
    const a = computeSignature({ errorMessage: "A", pageUrl: "https://x/y" });
    const b = computeSignature({ errorMessage: "B", pageUrl: "https://x/y" });
    expect(a).not.toBe(b);
  });

  it("differs when pageUrl pathname differs", () => {
    const a = computeSignature({ errorMessage: "X", pageUrl: "https://x/a" });
    const b = computeSignature({ errorMessage: "X", pageUrl: "https://x/b" });
    expect(a).not.toBe(b);
  });

  it("differs when top stack frame differs", () => {
    const a = computeSignature({
      errorMessage: "X",
      pageUrl: "https://x/y",
      errorStack: "Error: X\n    at foo (a.js:1:1)",
    });
    const b = computeSignature({
      errorMessage: "X",
      pageUrl: "https://x/y",
      errorStack: "Error: X\n    at bar (b.js:1:1)",
    });
    expect(a).not.toBe(b);
  });

  it("handles missing pageUrl and stack", () => {
    const sig = computeSignature({
      errorMessage: "only-message",
      pageUrl: undefined,
      errorStack: undefined,
    });
    expect(typeof sig).toBe("string");
    expect(sig.length).toBeGreaterThan(0);
  });

  it("returns stable hash for malformed pageUrl", () => {
    const a = computeSignature({
      errorMessage: "X",
      pageUrl: "not-a-url?foo=bar",
    });
    const b = computeSignature({
      errorMessage: "X",
      pageUrl: "not-a-url?foo=baz",
    });
    expect(a).toBe(b);
  });
});

describe("shouldSkipDuplicate", () => {
  beforeEach(() => {
    clearDedupCache();
  });

  it("allows first occurrence, blocks immediate repeat", () => {
    const sig = "abc";
    expect(shouldSkipDuplicate(sig)).toBe(false);
    expect(shouldSkipDuplicate(sig)).toBe(true);
    expect(shouldSkipDuplicate(sig)).toBe(true);
  });

  it("allows different signatures through independently", () => {
    expect(shouldSkipDuplicate("sig1")).toBe(false);
    expect(shouldSkipDuplicate("sig2")).toBe(false);
    expect(shouldSkipDuplicate("sig1")).toBe(true);
    expect(shouldSkipDuplicate("sig2")).toBe(true);
  });

  it("lets same signature through after window expires", () => {
    const sig = "time-test";
    const t0 = 1_000_000;
    const windowMs = 5_000;
    expect(shouldSkipDuplicate(sig, windowMs, t0)).toBe(false);
    expect(shouldSkipDuplicate(sig, windowMs, t0 + 1_000)).toBe(true);
    expect(shouldSkipDuplicate(sig, windowMs, t0 + 4_999)).toBe(true);
    expect(shouldSkipDuplicate(sig, windowMs, t0 + 5_001)).toBe(false);
  });

  it("blocks duplicate flood within window", () => {
    const sig = "flood";
    let blocked = 0;
    let allowed = 0;
    for (let i = 0; i < 65; i++) {
      if (shouldSkipDuplicate(sig)) blocked++;
      else allowed++;
    }
    expect(allowed).toBe(1);
    expect(blocked).toBe(64);
  });

  it("clearDedupCache resets state", () => {
    const sig = "reset-me";
    shouldSkipDuplicate(sig);
    expect(shouldSkipDuplicate(sig)).toBe(true);
    clearDedupCache();
    expect(shouldSkipDuplicate(sig)).toBe(false);
  });

  it("end-to-end: identical errors coalesced via signature + window", () => {
    clearDedupCache();
    const errs = Array.from({ length: 65 }, () => ({
      errorMessage: "Failed to fetch",
      pageUrl: "https://app.example.com/dashboard",
      errorStack: "Error: Failed to fetch\n    at fetchData (app.js:42:13)",
    }));
    let sent = 0;
    for (const e of errs) {
      const sig = computeSignature(e);
      if (!shouldSkipDuplicate(sig)) sent++;
    }
    expect(sent).toBe(1);
  });
});
