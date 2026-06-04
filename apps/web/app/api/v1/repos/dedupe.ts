// Collapse duplicate repo rows by githubId — the same GitHub repo can end up
// connected more than once. Keeps the FIRST occurrence (callers pass rows
// ordered newest-first), so the selector never shows a repo twice. Pure +
// unit-testable.
export function dedupeReposByGithubId<T extends { githubId: number }>(rows: T[]): T[] {
  const seen = new Set<number>();
  return rows.filter((r) => {
    if (seen.has(r.githubId)) return false;
    seen.add(r.githubId);
    return true;
  });
}
