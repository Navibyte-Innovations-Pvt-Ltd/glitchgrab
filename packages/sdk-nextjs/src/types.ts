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
}

// ─── Report Types ────────────────────────────────────────

export type ReportType = "BUG" | "FEATURE_REQUEST" | "QUESTION" | "OTHER";

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

export interface ReportResult {
  success: boolean;
  reportId?: string;
  issueUrl?: string;
  issueNumber?: number;
  title?: string;
  intent?: string;
  message?: string;
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

// ─── Context ─────────────────────────────────────────────

export interface CapturedContext {
  url: string;
  userAgent: string;
  timestamp: string;
  visitedPages: string[];
  breadcrumbs: Breadcrumb[];
  deviceInfo: DeviceInfo | null;
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
}

export interface ReportButtonProps {
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  label?: string;
  className?: string;
  /** Allow reporting feature requests, questions, not just bugs */
  types?: ReportType[];
  /** Dialog variant: "classic" (single screen) or "stepper" (3-step wizard). Default: "classic" */
  variant?: "classic" | "stepper";
  /** Show severity picker in stepper mode for BUG type. Default: true */
  showSeverity?: boolean;
}

// ─── Hook Return ─────────────────────────────────────────

export interface UseGlitchgrabReturn {
  /** Report a bug programmatically */
  reportBug: (description: string, metadata?: Record<string, string>) => Promise<ReportResult | null>;
  /** Report with a specific type */
  report: (type: ReportType, description: string, metadata?: Record<string, string>) => Promise<ReportResult | null>;
  /** Add a custom breadcrumb */
  addBreadcrumb: (message: string, data?: Record<string, string>) => void;
  /** Open the ReportButton modal programmatically (captures screenshot + shows dialog) */
  openReportDialog: (options?: { description?: string; type?: ReportType }) => void;
  /** The token being used */
  token: string;
  /** The base URL of the Glitchgrab API */
  baseUrl: string;
}
