// Minimal type surface ReportDialog needs — kept separate from the SDK's
// full types.ts (which also covers auto-capture/breadcrumbs, irrelevant here).

export type ReportType =
  | "BUG"
  | "FEATURE_REQUEST"
  | "UI_IMPROVEMENT"
  | "PERFORMANCE"
  | "SECURITY"
  | "QUESTION"
  | "OTHER";

export type ReportSeverity = "low" | "medium" | "high";

export interface ReportResult {
  success: boolean;
  reportId?: string;
  issueUrl?: string;
  issueNumber?: number;
  title?: string;
  intent?: string;
  message?: string;
}

/**
 * Who the dialog says is filing the report. Hosts resolve this differently —
 * the SDK from its `session` prop, the extension and GlitchRecord from the
 * server-side `ExtensionSession` identity — so the dialog takes it as data and
 * never guesses.
 *
 * `null`/omitted renders the anonymous state rather than nothing: a reporter
 * who believes they're signed in and isn't would otherwise file a report with
 * no way to be followed up, and never know.
 */
export interface ReportReporter {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  /** Optional role suffix, e.g. "tester" — shown next to the name */
  role?: string | null;
}

/** The function a host (SDK or extension) supplies to actually submit a report. */
export type ReportFn = (
  type: ReportType,
  description: string,
  metadata?: Record<string, string>
) => Promise<ReportResult | null>;

/** Optional: polish description text. Never throws — returns original text on failure. */
export type EnhanceTextFn = (text: string, screenshot?: string | null) => Promise<string>;
