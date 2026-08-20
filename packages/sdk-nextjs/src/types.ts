import type { ReactNode } from "react";

// ─── Config ──────────────────────────────────────────────

export interface GlitchgrabConfig {
  token: string;
  baseUrl?: string;
  onError?: (error: Error) => void;
  /** Called after a report is sent — use to sync with your own ticket system */
  onReportSent?: (result: ReportResult) => void;
  /** Enable breadcrumb tracking (default: true) */
  breadcrumbs?: boolean;
  /** Max breadcrumbs to keep (default: 50) */
  maxBreadcrumbs?: number;
  /**
   * Skip auto-capture for errors matching any of these patterns (checked against the
   * error message). String = substring match, RegExp = `.test()`. Use for known-noisy
   * signatures that aren't app bugs — e.g. browser extension bridge errors.
   */
  ignoreErrors?: (string | RegExp)[];
}

// ─── Report Types ────────────────────────────────────────

export type ReportType =
  | "BUG"
  | "FEATURE_REQUEST"
  | "UI_IMPROVEMENT"
  | "PERFORMANCE"
  | "SECURITY"
  | "QUESTION"
  | "OTHER";

export type ReportSeverity = "low" | "medium" | "high";

export interface ReportPayload {
  token: string;
  source: "SDK_AUTO" | "SDK_USER_REPORT";
  type?: ReportType;
  description?: string;
  errorMessage?: string;
  errorStack?: string;
  componentStack?: string;
  pageUrl?: string;
  userAgent?: string;
  breadcrumbs?: Breadcrumb[];
  deviceInfo?: DeviceInfo;
  metadata?: Record<string, string>;
}

/** Extra context for an error your app already caught — see `captureError` */
export interface CaptureErrorOptions {
  /** React component stack, e.g. from `componentDidCatch` / `onCaughtError` */
  componentStack?: string;
  /**
   * Next.js error digest. In production Next replaces server-boundary error
   * messages with a generic string — the digest is the only thing that tells
   * two different crashes apart, so it also feeds the dedup signature.
   */
  digest?: string;
  /** Which boundary caught it, e.g. `"next-app-router"` — attached as metadata */
  boundary?: string;
  /** Extra metadata merged into the report */
  metadata?: Record<string, string>;
}

export interface ReportResult {
  success: boolean;
  reportId?: string;
  issueUrl?: string;
  issueNumber?: number;
  title?: string;
  intent?: string;
  message?: string;
}

// ─── Feedback ────────────────────────────────────────────
// Feedback your end-users leave about YOUR app. Glitchgrab stores it so you
// don't need a table, a route, and a migration of your own. It never becomes
// a GitHub issue — that's what reports are for.

export interface FeedbackPayload {
  token: string;
  /** 1–5 stars */
  rating: number;
  message?: string;
  pageUrl?: string;
  userAgent?: string;
  metadata?: Record<string, string>;
}

export interface FeedbackResult {
  success: boolean;
  feedbackId?: string;
  rating?: number;
  createdAt?: string;
  message?: string;
}

/** One stored feedback entry, as returned by the read endpoint. */
export interface GlitchgrabFeedback {
  id: string;
  rating: number;
  message: string | null;
  pageUrl: string | null;
  /** Whether the repo owner published this entry for public display */
  approved: boolean;
  reporterPrimaryKey: string;
  reporterName: string;
  createdAt: string;
}

// ─── Breadcrumbs ─────────────────────────────────────────

export type BreadcrumbType =
  | "console"
  | "navigation"
  | "api"
  | "click"
  | "error"
  | "custom";

export interface Breadcrumb {
  type: BreadcrumbType;
  message: string;
  timestamp: string;
  data?: Record<string, string>;
}

// ─── Device Info ─────────────────────────────────────────

export interface DeviceInfo {
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  platform: string;
  language: string;
  online: boolean;
  colorScheme: string;
  devicePixelRatio: number;
}

// ─── Runtime Health ──────────────────────────────────────

/**
 * Machine state at the moment of the crash, as opposed to `DeviceInfo`, which
 * describes the machine itself. Most fields are Chromium-only and simply absent
 * elsewhere — never assume one is present.
 */
export interface RuntimeInfo {
  /** ms since this page loaded */
  timeOnPageMs: number;
  /** How many errors the SDK has already auto-captured in this page session */
  errorCount: number;
  /** `document.visibilityState` — a crash in a background tab reads differently */
  visibility: string;
  jsHeapUsedMb?: number;
  jsHeapLimitMb?: number;
  /** `navigator.connection.effectiveType` — "4g", "3g", "2g", "slow-2g" */
  connectionType?: string;
  downlinkMbps?: number;
  rttMs?: number;
  saveData?: boolean;
}

// ─── Context ─────────────────────────────────────────────

export interface CapturedContext {
  url: string;
  userAgent: string;
  timestamp: string;
  visitedPages: string[];
  breadcrumbs: Breadcrumb[];
  deviceInfo: DeviceInfo | null;
  /** Runtime health snapshot — null when unavailable (SSR) */
  runtime: RuntimeInfo | null;
  /** Key-values the host app attached via `setContext` */
  appContext: Record<string, string>;
  /** Build identifier this crash came from, if known */
  release?: string;
}

// ─── Session ────────────────────────────────────────────

export interface GlitchgrabSession {
  /** Primary key of the user in your database (required) */
  userId: string;
  /** Display name (required) */
  name: string;
  /** Email address */
  email?: string | null;
  /** Phone number */
  phone?: string | null;
  /** Any extra fields you want attached to reports */
  [key: string]: unknown;
}

// ─── Component Props ─────────────────────────────────────

export interface GlitchgrabProviderProps {
  token: string;
  /** Logged-in user session — include userId (your DB primary key) so reports are traceable */
  session?: GlitchgrabSession | null;
  baseUrl?: string;
  onError?: (error: Error) => void;
  onReportSent?: (result: ReportResult) => void;
  breadcrumbs?: boolean;
  maxBreadcrumbs?: number;
  children: ReactNode;
  fallback?: ReactNode;
  /** Which report types to show in the dialog (default: all) */
  types?: ReportType[];
  /** Show severity picker for BUG type (default: true) */
  showSeverity?: boolean;
  /**
   * Skip auto-capture for errors matching any of these patterns (checked against the
   * error message). String = substring match, RegExp = `.test()`. Use for known-noisy
   * signatures that aren't app bugs — e.g. browser extension bridge errors.
   */
  ignoreErrors?: (string | RegExp)[];
  /**
   * Build identifier attached to every report — a version, a tag, a commit SHA.
   * Tells you which deploy introduced a crash. Falls back to
   * `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_RELEASE`, then
   * `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` when not passed.
   */
  release?: string;
  /**
   * App-owned context attached to every report — orgId, plan, role, feature
   * flags. Merged with anything set imperatively via `setContext`.
   */
  context?: Record<string, unknown>;
  /**
   * Extra origins whose failed-request bodies may be recorded in breadcrumbs,
   * e.g. `["https://api.myapp.com"]`. Same-origin requests are always recorded;
   * third-party APIs are excluded by default because their error envelopes carry
   * data you don't control and shouldn't forward into a GitHub issue.
   */
  responseBodyOrigins?: string[];
}

export interface ReportButtonProps {
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  label?: string;
  className?: string;
}

export interface FeedbackButtonProps {
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  label?: string;
  className?: string;
  /** Heading inside the dialog (default: "How are we doing?") */
  title?: string;
  /** Placeholder for the message box */
  placeholder?: string;
  /** Shown after a successful submit */
  thanksMessage?: string;
}

// ─── Hook Return ─────────────────────────────────────────

export interface UseGlitchgrabReturn {
  /** Report a bug programmatically */
  reportBug: (description: string, metadata?: Record<string, string>) => Promise<ReportResult | null>;
  /** Report with a specific type */
  report: (type: ReportType, description: string, metadata?: Record<string, string>) => Promise<ReportResult | null>;
  /**
   * Report an error your app already caught — a framework error boundary
   * (`app/error.tsx`, React Router `errorElement`, Remix `ErrorBoundary`) or a
   * `try/catch`. These never reach `window.onerror`, so auto-capture misses them.
   * Sends `SDK_AUTO`. Fire-and-forget, never throws.
   */
  captureError: (error: unknown, options?: CaptureErrorOptions) => void;
  /**
   * Attach a key-value to every future report — orgId, plan, role, feature flag.
   * Pass `null` to remove a key. Survives navigation and provider remounts.
   */
  setContext: (key: string, value: unknown) => void;
  /** Set several context keys at once. Merges; does not replace. */
  setContexts: (values: Record<string, unknown>) => void;
  /**
   * Save a 1–5 star rating your end-user left about your app. Stored by
   * Glitchgrab and shown on your Feedback page — never becomes a GitHub issue.
   * Returns null on any failure (never throws).
   */
  sendFeedback: (
    rating: number,
    message?: string,
    metadata?: Record<string, string>
  ) => Promise<FeedbackResult | null>;
  /** Open the built-in feedback dialog (stars + message) programmatically */
  openFeedbackDialog: () => void;
  /** Add a custom breadcrumb */
  addBreadcrumb: (message: string, data?: Record<string, string>) => void;
  /** Open the ReportButton modal programmatically (captures screenshot + shows dialog) */
  openReportDialog: (options?: { description?: string; type?: ReportType }) => void;
  /**
   * Open the demo booking dialog.
   *
   * Slots come from the project owner's real Google calendar, and the booking
   * creates a Meet on it — so this is only useful for projects whose owner has
   * connected a calendar and enabled booking in Glitchgrab.
   */
  openBookingDialog: () => void;
  /**
   * Optional: polish user-written description text via the Glitchgrab AI enhance endpoint.
   * Fixes grammar / clarity only — never invents details or changes meaning.
   * Returns the polished text, or the original text on any failure (never throws).
   */
  enhanceText: (text: string, screenshot?: string | null) => Promise<string>;
  /**
   * OS-aware label for the shortcut that opens the report dialog —
   * `⌘⇧G` on Mac, `Ctrl+Shift+G` elsewhere. Render this instead of
   * hardcoding the shortcut, so the hint stays in sync with the handler.
   */
  shortcutLabel: string;
  /** The token being used */
  token: string;
  /** The base URL of the Glitchgrab API */
  baseUrl: string;
}
