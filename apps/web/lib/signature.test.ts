// signature tests — run with: bun test signature.test.ts
//
// BUG (#816/#817/#818): "Object Not Found Matching Id:2/3/4, MethodName:update,
// ParamCount:4" created a new GitHub issue every time because the raw numeric id
// was hashed verbatim, producing a different signature per occurrence.
import { describe, expect, it } from "bun:test";
import { computeReportSignature } from "./signature";

describe("computeReportSignature", () => {
  it("returns null when errorMessage is missing or blank", () => {
    expect(computeReportSignature({ errorMessage: null })).toBeNull();
    expect(computeReportSignature({ errorMessage: "  " })).toBeNull();
  });

  it("folds a dynamic numeric id in the message into one signature", () => {
    const base = { pageUrl: "https://app.example.com/dashboard", errorStack: null };
    const a = computeReportSignature({ ...base, errorMessage: "Object Not Found Matching Id:2, MethodName:update, ParamCount:4" });
    const b = computeReportSignature({ ...base, errorMessage: "Object Not Found Matching Id:3, MethodName:update, ParamCount:4" });
    const c = computeReportSignature({ ...base, errorMessage: "Object Not Found Matching Id:4, MethodName:update, ParamCount:4" });
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("folds a UUID in the message into one signature", () => {
    const base = { pageUrl: "https://app.example.com/dashboard", errorStack: null };
    const a = computeReportSignature({ ...base, errorMessage: "Failed to load user 3fa85f64-5717-4562-b3fc-2c963f66afa6" });
    const b = computeReportSignature({ ...base, errorMessage: "Failed to load user 11111111-2222-3333-4444-555555555555" });
    expect(a).toBe(b);
  });

  it("still distinguishes genuinely different error messages", () => {
    const base = { pageUrl: "https://app.example.com/dashboard", errorStack: null };
    const a = computeReportSignature({ ...base, errorMessage: "Object Not Found Matching Id:2, MethodName:update, ParamCount:4" });
    const b = computeReportSignature({ ...base, errorMessage: "Timeout waiting for response" });
    expect(a).not.toBe(b);
  });

  it("ignores the query string but not the pathname when hashing pageUrl", () => {
    const msg = "Object Not Found Matching Id:2, MethodName:update, ParamCount:4";
    const a = computeReportSignature({ errorMessage: msg, pageUrl: "https://app.example.com/dashboard?x=1", errorStack: null });
    const b = computeReportSignature({ errorMessage: msg, pageUrl: "https://app.example.com/dashboard?x=2", errorStack: null });
    const c = computeReportSignature({ errorMessage: msg, pageUrl: "https://app.example.com/settings", errorStack: null });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
