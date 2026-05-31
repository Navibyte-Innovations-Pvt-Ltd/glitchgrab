// Repo dedupe tests — run: bun test dedupe.test.ts
import { describe, expect, it } from "bun:test";
import { dedupeReposByGithubId } from "./dedupe";

describe("dedupeReposByGithubId", () => {
  it("removes rows that repeat the same githubId, keeping the first", () => {
    const rows = [
      { id: "a", githubId: 1, fullName: "org/glitchrecord" },
      { id: "b", githubId: 2, fullName: "org/navi-assist" },
      { id: "c", githubId: 1, fullName: "org/glitchrecord" }, // dup of a
    ];
    const out = dedupeReposByGithubId(rows);
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("keeps the FIRST occurrence (newest, since rows are ordered desc)", () => {
    const rows = [
      { id: "newest", githubId: 7 },
      { id: "older", githubId: 7 },
    ];
    expect(dedupeReposByGithubId(rows)[0].id).toBe("newest");
  });

  it("returns all rows when there are no duplicates", () => {
    const rows = [{ githubId: 1 }, { githubId: 2 }, { githubId: 3 }];
    expect(dedupeReposByGithubId(rows)).toHaveLength(3);
  });

  it("handles an empty list", () => {
    expect(dedupeReposByGithubId([])).toEqual([]);
  });
});
