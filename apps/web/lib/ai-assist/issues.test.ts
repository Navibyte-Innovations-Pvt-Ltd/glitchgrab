// Open-issue ranking for the report assistant (#330 follow-up).
//
// The list exists so the assistant can say "we already have this". What it must
// never do is grow: a repo with hundreds of open issues still sends one short,
// relevant slice into a turn a person is waiting through.

import { describe, it, expect } from "bun:test";
import { rankIssues, resolveIssue, type OpenIssue } from "./issues";

function issue(number: number, title: string): OpenIssue {
  return {
    number,
    title,
    url: `https://github.com/o/r/issues/${number}`,
    updatedAt: "2026-08-01T00:00:00Z",
  };
}

describe("rankIssues", () => {
  it("puts the issue that shares the reporter's words first", () => {
    const issues = [
      issue(1, "Dark mode flickers on the dashboard"),
      issue(2, "Save button does nothing on the settings page"),
      issue(3, "Add CSV export to reports"),
    ];
    const ranked = rankIssues(issues, "the save button does nothing when I press it");
    expect(ranked[0].number).toBe(2);
  });

  it("keeps the list short so it cannot crowd out the screenshot", () => {
    const issues = Array.from({ length: 100 }, (_, i) => issue(i + 1, `thing ${i} broken`));
    expect(rankIssues(issues, "thing broken")).toHaveLength(30);
  });

  it("falls back to GitHub's recently-updated order when nothing is typed yet", () => {
    // Someone who tapped a starter chip has said nothing specific. The issues
    // the team touched most recently are the right default to show.
    const issues = [issue(9, "newest"), issue(8, "older"), issue(7, "oldest")];
    expect(rankIssues(issues, "   ").map((i) => i.number)).toEqual([9, 8, 7]);
  });

  it("does not rank on words every bug report contains", () => {
    // "the page has a bug" matches nothing in particular — if stop words
    // counted, whichever title said "page" would win every conversation.
    const issues = [
      issue(1, "The page has a bug in it"),
      issue(2, "Export produces an empty CSV file"),
    ];
    const ranked = rankIssues(issues, "the page has a bug", 2);
    expect(ranked).toHaveLength(2);
  });

  it("does not let a long title win on surface area alone", () => {
    const issues = [
      issue(1, "Export CSV"),
      issue(
        2,
        "Some very long title mentioning export and csv and many other unrelated words about things"
      ),
    ];
    expect(rankIssues(issues, "export csv")[0].number).toBe(1);
  });
});

describe("resolveIssue", () => {
  const issues = [issue(5, "Save button does nothing")];

  it("resolves a number that really is open on this repo", () => {
    expect(resolveIssue(issues, 5)?.number).toBe(5);
  });

  // The model's pick is a claim about untrusted text. A number it invented, or
  // one from another repo, must never reach the GitHub comment call.
  it("refuses a number that is not in the repo's own open list", () => {
    expect(resolveIssue(issues, 999)).toBeNull();
    expect(resolveIssue(issues, null)).toBeNull();
  });
});
