// digest tests — run with: bun test lib/digest.test.ts
//
// Covers the pure half of lib/digest.ts: the strings that go into a Meta
// template parameter (which rejects newlines and 4+ spaces outright) and the
// IST date arithmetic behind "mute me for today", which is the one place an
// off-by-one silently costs someone a whole day of notifications.
import { describe, expect, it } from "bun:test";
import {
  formatBreakdown,
  formatOwnPlate,
  isMuted,
  muteUntil,
  pickBreakdown,
  startOfIstDay,
} from "./digest";

const repo = (shortName: string, open: number) => ({
  fullName: `org/${shortName}`,
  shortName,
  open,
});

describe("formatBreakdown", () => {
  it("names each repo with its count", () => {
    expect(formatBreakdown([repo("practicestacks", 32), repo("abhyasika", 18)])).toBe(
      "practicestacks 32, abhyasika 18"
    );
  });

  it("drops repos with nothing open", () => {
    expect(formatBreakdown([repo("a", 5), repo("b", 0)])).toBe("a 5");
  });

  it("collapses the tail once past the limit", () => {
    const counts = [repo("a", 9), repo("b", 8), repo("c", 7), repo("d", 6), repo("e", 5), repo("f", 4)];
    expect(formatBreakdown(counts)).toBe("a 9, b 8, c 7, d 6, +2 more");
  });

  it("says so when everything is closed", () => {
    expect(formatBreakdown([repo("a", 0)])).toBe("nothing open anywhere");
    expect(formatBreakdown([])).toBe("nothing open anywhere");
  });

  it("never emits a newline or run of spaces — Meta rejects both (132018)", () => {
    const out = formatBreakdown([repo("a", 1), repo("b", 2), repo("c", 3), repo("d", 4), repo("e", 5)]);
    expect(out).not.toMatch(/[\n\r\t]/);
    expect(out).not.toMatch(/ {2,}/);
  });
});

describe("pickBreakdown", () => {
  it("leads with the org backlog when the owner has one", () => {
    const picked = pickBreakdown([repo("a", 30), repo("b", 5)], [repo("a", 2)]);
    expect(picked.headlineOpen).toBe(35);
    expect(formatBreakdown(picked.repoCounts)).toBe("a 30, b 5");
  });

  it("falls back to assigned work when the owned org is quiet", () => {
    // The contradiction this guards: "6 open issues waiting. Where they sit:
    // nothing open anywhere." Owning a quiet org is not having nothing to do.
    const picked = pickBreakdown([repo("owned", 0)], [repo("elsewhere", 6)]);
    expect(picked.headlineOpen).toBe(6);
    expect(formatBreakdown(picked.repoCounts)).toBe("elsewhere 6");
  });

  it("covers a developer who owns no repo at all", () => {
    const picked = pickBreakdown([], [repo("x", 4), repo("y", 1)]);
    expect(picked.headlineOpen).toBe(5);
    expect(formatBreakdown(picked.repoCounts)).toBe("x 4, y 1");
  });

  it("reports zero when both halves are empty, so the cron stays quiet", () => {
    expect(pickBreakdown([], []).headlineOpen).toBe(0);
    expect(pickBreakdown([repo("a", 0)], [repo("a", 0)]).headlineOpen).toBe(0);
  });

  it("sorts the breakdown biggest first without mutating the input", () => {
    const owned = [repo("small", 1), repo("big", 9)];
    const picked = pickBreakdown(owned, []);
    expect(picked.repoCounts.map((c) => c.shortName)).toEqual(["big", "small"]);
    expect(owned.map((c) => c.shortName)).toEqual(["small", "big"]);
  });

  it("never disagrees with its own breakdown", () => {
    const picked = pickBreakdown([repo("a", 0), repo("b", 0)], [repo("c", 3)]);
    const total = picked.repoCounts.reduce((sum, c) => sum + c.open, 0);
    expect(total).toBe(picked.headlineOpen);
  });
});

describe("formatOwnPlate", () => {
  it("distinguishes 'zero assigned' from 'we never linked your GitHub'", () => {
    expect(formatOwnPlate(0, true)).toBe("nothing assigned to you right now");
    expect(formatOwnPlate(0, false)).toBe("GitHub not linked yet, so nothing to show");
    expect(formatOwnPlate(4, true)).toBe("4 assigned to you");
  });
});

describe("muteUntil", () => {
  // 10:00 IST on 22 Aug 2026 == 04:30 UTC the same day.
  const morningIst = new Date("2026-08-22T04:30:00.000Z");
  // 20:00 IST on 22 Aug 2026 == 14:30 UTC the same day.
  const eveningIst = new Date("2026-08-22T14:30:00.000Z");

  it("mutes a morning reply until midnight IST tonight", () => {
    // Midnight IST on the 23rd == 18:30 UTC on the 22nd.
    expect(muteUntil(morningIst).toISOString()).toBe("2026-08-22T18:30:00.000Z");
  });

  it("carries an after-hours reply through the whole of tomorrow", () => {
    // The evening recap has already gone out, so "rest of today" would mute
    // nothing at all — the promise the message makes is the next day.
    expect(muteUntil(eveningIst).toISOString()).toBe("2026-08-23T18:30:00.000Z");
  });

  it("survives a month boundary", () => {
    const lastDay = new Date("2026-08-31T04:30:00.000Z");
    expect(muteUntil(lastDay).toISOString()).toBe("2026-08-31T18:30:00.000Z");
  });

  it("mutes past the next morning digest, whichever way it lands", () => {
    // 08:00 IST == 02:30 UTC — the morning cron slot.
    for (const now of [morningIst, eveningIst]) {
      const until = muteUntil(now);
      const nextDigest = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      nextDigest.setUTCHours(2, 30, 0, 0);
      expect(until.getTime()).toBeGreaterThan(nextDigest.getTime() - 24 * 60 * 60 * 1000);
    }
  });
});

describe("startOfIstDay", () => {
  it("rewinds to midnight IST, not midnight UTC", () => {
    // 01:00 IST on the 23rd is still 19:30 UTC on the 22nd: the IST day began
    // at 18:30 UTC on the 22nd, while midnight UTC has not happened yet.
    expect(startOfIstDay(new Date("2026-08-22T19:30:00.000Z")).toISOString()).toBe(
      "2026-08-22T18:30:00.000Z"
    );
    expect(startOfIstDay(new Date("2026-08-22T04:30:00.000Z")).toISOString()).toBe(
      "2026-08-21T18:30:00.000Z"
    );
  });
});

describe("isMuted", () => {
  const now = new Date("2026-08-22T04:30:00.000Z");

  it("is false for never-muted and for an expired mute", () => {
    expect(isMuted(null, now)).toBe(false);
    expect(isMuted(undefined, now)).toBe(false);
    expect(isMuted(new Date("2026-08-21T18:30:00.000Z"), now)).toBe(false);
  });

  it("is true while the window is still open", () => {
    expect(isMuted(new Date("2026-08-22T18:30:00.000Z"), now)).toBe(true);
  });
});
