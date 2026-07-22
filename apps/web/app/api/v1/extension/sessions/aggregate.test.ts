// Tester activity aggregation tests — run: bun test aggregate.test.ts
import { describe, expect, it } from "bun:test";
import { aggregateTesterActivity } from "./aggregate";

describe("aggregateTesterActivity", () => {
  it("sums multiple sessions for the same tester by email", () => {
    const out = aggregateTesterActivity(
      [
        {
          testerName: "Priya",
          testerEmail: "priya@x.com",
          startedAt: new Date("2026-01-01T10:00:00Z"),
          lastPingAt: new Date("2026-01-01T10:30:00Z"),
          endedAt: new Date("2026-01-01T10:30:00Z"),
        },
        {
          testerName: "Priya",
          testerEmail: "priya@x.com",
          startedAt: new Date("2026-01-02T10:00:00Z"),
          lastPingAt: new Date("2026-01-02T10:15:00Z"),
          endedAt: null, // still "open" — use lastPingAt as the end
        },
      ],
      []
    );
    expect(out).toHaveLength(1);
    expect(out[0].workTimeMs).toBe(30 * 60_000 + 15 * 60_000);
  });

  it("merges session time and bug count for the same tester", () => {
    const out = aggregateTesterActivity(
      [
        {
          testerName: "Rahul",
          testerEmail: "rahul@x.com",
          startedAt: new Date("2026-01-01T00:00:00Z"),
          lastPingAt: new Date("2026-01-01T01:00:00Z"),
          endedAt: new Date("2026-01-01T01:00:00Z"),
        },
      ],
      [{ reporterName: "Rahul", reporterEmail: "rahul@x.com", count: 4 }]
    );
    expect(out).toEqual([
      { testerName: "Rahul", testerEmail: "rahul@x.com", workTimeMs: 60 * 60_000, bugCount: 4 },
    ]);
  });

  it("falls back to testerName as the merge key when email is missing", () => {
    const out = aggregateTesterActivity(
      [
        {
          testerName: "NoEmail Tester",
          testerEmail: null,
          startedAt: new Date("2026-01-01T00:00:00Z"),
          lastPingAt: new Date("2026-01-01T00:10:00Z"),
          endedAt: null,
        },
      ],
      [{ reporterName: "NoEmail Tester", reporterEmail: null, count: 1 }]
    );
    expect(out).toHaveLength(1);
    expect(out[0].bugCount).toBe(1);
    expect(out[0].workTimeMs).toBe(10 * 60_000);
  });

  it("keeps distinct testers separate and sorts by work time descending", () => {
    const out = aggregateTesterActivity(
      [
        {
          testerName: "Short",
          testerEmail: "short@x.com",
          startedAt: new Date("2026-01-01T00:00:00Z"),
          lastPingAt: new Date("2026-01-01T00:05:00Z"),
          endedAt: null,
        },
        {
          testerName: "Long",
          testerEmail: "long@x.com",
          startedAt: new Date("2026-01-01T00:00:00Z"),
          lastPingAt: new Date("2026-01-01T02:00:00Z"),
          endedAt: null,
        },
      ],
      []
    );
    expect(out.map((t) => t.testerName)).toEqual(["Long", "Short"]);
  });

  it("clamps a negative duration (clock skew) to zero instead of subtracting time", () => {
    const out = aggregateTesterActivity(
      [
        {
          testerName: "Skewed",
          testerEmail: "skew@x.com",
          startedAt: new Date("2026-01-01T10:00:00Z"),
          lastPingAt: new Date("2026-01-01T09:00:00Z"), // before startedAt
          endedAt: null,
        },
      ],
      []
    );
    expect(out[0].workTimeMs).toBe(0);
  });

  it("returns an empty list when there is no data", () => {
    expect(aggregateTesterActivity([], [])).toEqual([]);
  });
});
