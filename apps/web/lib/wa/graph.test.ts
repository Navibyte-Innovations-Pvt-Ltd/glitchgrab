// Graph error classification — run with: bun test lib/wa/graph.test.ts
//
// Meta answers 400 for both "your token is dead" and "that template name is
// taken", so the HTTP status alone cannot drive retry behaviour. Getting this
// wrong in the retryable direction is what pinned meeting rows at
// "transcribing…" for days: a permanent 4xx retried forever.
import { describe, expect, it } from "bun:test";
import { WaGraphError } from "./graph";

describe("auth failures", () => {
  it("recognises code 190 as an auth error", () => {
    expect(new WaGraphError("token expired", 400, 190).isAuthError).toBe(true);
  });

  it("recognises a 401 as an auth error whatever the code", () => {
    expect(new WaGraphError("nope", 401).isAuthError).toBe(true);
  });

  it("does not retry a dead token", () => {
    // Re-onboarding is the only fix; retrying just burns quota.
    expect(new WaGraphError("token expired", 400, 190).isRetryable).toBe(false);
  });
});

describe("rate limits", () => {
  for (const code of [4, 80007, 131048]) {
    it(`treats code ${code} as a rate limit`, () => {
      expect(new WaGraphError("slow down", 400, code).isRateLimit).toBe(true);
    });
  }

  it("treats a 429 as a rate limit", () => {
    expect(new WaGraphError("slow down", 429).isRateLimit).toBe(true);
  });

  it("retries a rate limit", () => {
    expect(new WaGraphError("slow down", 429).isRetryable).toBe(true);
  });
});

describe("retry policy", () => {
  it("retries a 5xx", () => {
    expect(new WaGraphError("meta is down", 503).isRetryable).toBe(true);
  });

  it("does NOT retry an ordinary 4xx", () => {
    // A duplicate template name will be rejected identically forever.
    expect(new WaGraphError("template name taken", 400, 2388023).isRetryable).toBe(false);
  });

  it("treats a network failure as retryable", () => {
    expect(new WaGraphError("fetch failed", 503).isRetryable).toBe(true);
  });
});
