// Pure aggregation for the "Tester Activity" audit view (#297). Extracted so
// the merge-by-tester + duration math is testable without a DB.
export interface TesterSessionRow {
  testerName: string;
  testerEmail: string | null;
  startedAt: Date;
  lastPingAt: Date;
  endedAt: Date | null;
}

export interface TesterReportCountRow {
  reporterName: string;
  reporterEmail: string | null;
  count: number;
}

export interface TesterActivity {
  testerName: string;
  testerEmail: string | null;
  workTimeMs: number;
  bugCount: number;
}

export function aggregateTesterActivity(
  sessions: TesterSessionRow[],
  reportCounts: TesterReportCountRow[]
): TesterActivity[] {
  const byTester = new Map<string, TesterActivity>();

  for (const s of sessions) {
    const key = s.testerEmail ?? s.testerName;
    const durationMs = (s.endedAt ?? s.lastPingAt).getTime() - s.startedAt.getTime();
    const entry = byTester.get(key) ?? {
      testerName: s.testerName,
      testerEmail: s.testerEmail,
      workTimeMs: 0,
      bugCount: 0,
    };
    entry.workTimeMs += Math.max(0, durationMs);
    byTester.set(key, entry);
  }

  for (const r of reportCounts) {
    const key = r.reporterEmail ?? r.reporterName;
    const entry = byTester.get(key) ?? {
      testerName: r.reporterName,
      testerEmail: r.reporterEmail,
      workTimeMs: 0,
      bugCount: 0,
    };
    entry.bugCount += r.count;
    byTester.set(key, entry);
  }

  return Array.from(byTester.values()).sort((a, b) => b.workTimeMs - a.workTimeMs);
}
