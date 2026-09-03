// Opt-out intent tests — run with: bun test lib/wa/conversations.test.ts
//
// This flag permanently suppresses marketing to a contact. A false positive
// costs the tenant a customer they were allowed to message; a false negative is
// a compliance breach Meta charges to their quality rating. Both directions
// matter, so both are pinned here.
import { describe, expect, it } from "bun:test";
import { detectOptOut, normalizeContact } from "./conversations";

describe("stop intent", () => {
  for (const text of [
    "STOP",
    "stop",
    "unsubscribe",
    "opt-out",
    "remove me",
    "please stop messaging",
    "do not message me again",
    "remove my number from your list",
  ]) {
    it(`treats "${text}" as opting out`, () => {
      expect(detectOptOut(text)).toBe("out");
    });
  }
});

describe("start intent", () => {
  for (const text of ["START", "resume", "subscribe"]) {
    it(`treats "${text}" as opting back in`, () => {
      expect(detectOptOut(text)).toBe("in");
    });
  }
});

describe("everything else is left alone", () => {
  // The expensive mistake: reading an ordinary reply as "never contact me".
  for (const text of [
    "no",
    "not now",
    "no thanks",
    "later please",
    "can you stop by tomorrow?",
    "I want to stop coming on Sundays",
    "yes",
    "what are the timings",
    "",
    "   ",
  ]) {
    it(`ignores "${text}"`, () => {
      expect(detectOptOut(text)).toBeNull();
    });
  }
});

describe("normalizeContact", () => {
  it("strips everything that is not a digit", () => {
    expect(normalizeContact("+91 82752 27189")).toBe("918275227189");
    expect(normalizeContact("(+91)-8275-227189")).toBe("918275227189");
  });

  it("is stable, so the same person is one conversation", () => {
    // The row is keyed on (tenantId, contactPhone). Two spellings of one number
    // becoming two threads is how an inbox quietly splits in half.
    expect(normalizeContact("+918275227189")).toBe(normalizeContact("91 8275 227189"));
  });
});
