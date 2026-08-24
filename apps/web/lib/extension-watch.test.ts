import { describe, expect, it } from "bun:test";
import { decideNotification } from "./extension-watch";
import { parseItemId } from "./chrome-store";

/**
 * These rules are the whole feature. Getting them wrong in either direction is
 * expensive: too chatty and the rejection gets ignored with the rest, too quiet
 * and a draft sits for a week while everyone believes it shipped.
 */

const HOUR = 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

function row(over: Partial<Parameters<typeof decideNotification>[0]> = {}) {
  return {
    state: "IN_REVIEW" as const,
    notifiedState: null,
    stateSince: new Date(NOW - HOUR),
    stateDetail: null,
    ...over,
  };
}

describe("decideNotification", () => {
  it("says nothing while a fresh submission is in review", () => {
    expect(decideNotification(row({ state: "DRAFT" }), "IN_REVIEW", NOW)).toBeNull();
  });

  it("announces a publish, once", () => {
    const published = decideNotification(row(), "PUBLISHED", NOW);
    expect(published?.headline).toBe("is published");

    const again = decideNotification(
      row({ state: "PUBLISHED", notifiedState: "PUBLISHED" }),
      "PUBLISHED",
      NOW
    );
    expect(again).toBeNull();
  });

  it("always reports a rejection, and quotes Google's reason", () => {
    const notice = decideNotification(
      row({ stateDetail: "Description mentions a competitor" }),
      "NEEDS_ATTENTION",
      NOW
    );
    expect(notice?.headline).toBe("needs your attention");
    expect(notice?.detail).toContain("Description mentions a competitor");
  });

  it("does not repeat a rejection it already reported", () => {
    const repeat = decideNotification(
      row({ state: "NEEDS_ATTENTION", notifiedState: "NEEDS_ATTENTION" }),
      "NEEDS_ATTENTION",
      NOW
    );
    expect(repeat).toBeNull();
  });

  it("leaves a fresh draft alone but nags an old one", () => {
    const fresh = decideNotification(
      row({ state: "DRAFT", stateSince: new Date(NOW - HOUR) }),
      "DRAFT",
      NOW
    );
    expect(fresh).toBeNull();

    const stale = decideNotification(
      row({ state: "DRAFT", stateSince: new Date(NOW - 13 * HOUR) }),
      "DRAFT",
      NOW
    );
    expect(stale?.headline).toBe("is still a draft");
  });

  it("nags a review only after three days", () => {
    const twoDays = decideNotification(
      row({ stateSince: new Date(NOW - 48 * HOUR) }),
      "IN_REVIEW",
      NOW
    );
    expect(twoDays).toBeNull();

    const fourDays = decideNotification(
      row({ stateSince: new Date(NOW - 96 * HOUR) }),
      "IN_REVIEW",
      NOW
    );
    expect(fourDays?.headline).toBe("is still in review");
  });

  it("never treats an unreadable answer as good news", () => {
    expect(decideNotification(row(), "UNKNOWN", NOW)).toBeNull();
  });
});

describe("parseItemId", () => {
  const ID = "fmkadmapgofadopljbjfkapdkoienihi";

  it("takes a bare id", () => {
    expect(parseItemId(ID)).toBe(ID);
    expect(parseItemId(`  ${ID}  `)).toBe(ID);
  });

  it("takes the real Glitchgrab listing url, verbatim", () => {
    // The exact string copied out of Chrome's address bar: percent-encoded
    // em-dash in the slug, locale and authuser query params on the end.
    const pasted =
      "https://chromewebstore.google.com/detail/glitchgrab-%E2%80%94-bug-reports/bjnddojeemkbienciefaoiikfehfhpef?hl=en-GB&authuser=0";
    expect(parseItemId(pasted)).toBe("bjnddojeemkbienciefaoiikfehfhpef");
    expect(parseItemId(`  ${pasted}  `)).toBe("bjnddojeemkbienciefaoiikfehfhpef");
    // Same link after the browser decodes the slug for display.
    expect(
      parseItemId(
        "https://chromewebstore.google.com/detail/glitchgrab-—-bug-reports/bjnddojeemkbienciefaoiikfehfhpef?hl=en-GB"
      )
    ).toBe("bjnddojeemkbienciefaoiikfehfhpef");
  });

  it("takes the store link people actually copy", () => {
    expect(parseItemId(`https://chromewebstore.google.com/detail/react-developer-tools/${ID}`)).toBe(ID);
    expect(parseItemId(`https://chrome.google.com/webstore/detail/react-developer-tools/${ID}`)).toBe(ID);
    expect(parseItemId(`https://chromewebstore.google.com/detail/${ID}?hl=en`)).toBe(ID);
  });

  it("takes a developer console link", () => {
    expect(parseItemId(`https://chrome.google.com/webstore/devconsole/detail/${ID}`)).toBe(ID);
  });

  it("refuses anything without an id in it", () => {
    expect(parseItemId("")).toBeNull();
    expect(parseItemId("https://chromewebstore.google.com/category/extensions")).toBeNull();
    // Store ids use a–p only; a stray hex-looking string is not one.
    expect(parseItemId("zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz")).toBeNull();
    expect(parseItemId(ID.slice(0, 31))).toBeNull();
  });
});
