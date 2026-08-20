"use client";

// ─── Core (required) ─────────────────────────────────────
export { GlitchgrabProvider, useGlitchgrab } from "./provider";

// ─── Optional Components ─────────────────────────────────
export { ReportButton } from "./report-button";
export { BookDemoButton } from "./book-demo-button";
export { FeedbackButton } from "./feedback-button";
export { GlitchgrabErrorBoundary } from "./error-boundary";

// ─── Caught-error reporting ──────────────────────────────
// Standalone form for call sites outside the provider tree (global-error.tsx)
// or outside React entirely. Inside the tree, prefer useGlitchgrab().captureError.
export { captureError } from "./capture";

// ─── App context ─────────────────────────────────────────
// Key-values attached to every report (orgId, plan, feature flags). Standalone
// form so non-React code can set them; also on useGlitchgrab().
export {
  setContext,
  setContexts,
  getAppContext,
  clearAppContext,
} from "./app-context";

// ─── Hooks ──────────────────────────────────────────────
export { useGlitchgrabReports, fetchGlitchgrabReports, useGlitchgrabActions } from "./use-reports";
export type { GlitchgrabReport } from "./use-reports";
export { useGlitchgrabFeedback, fetchGlitchgrabFeedback } from "./use-feedback";
export type { FeedbackQuery } from "./use-feedback";

// ─── Breadcrumbs ─────────────────────────────────────────
export {
  addBreadcrumb,
  getBreadcrumbs,
  clearBreadcrumbs,
  initBreadcrumbs,
} from "./breadcrumbs";

// ─── Keyboard shortcut ───────────────────────────────────
export {
  GLITCHGRAB_SHORTCUT,
  GLITCHGRAB_SHORTCUT_MAC,
  getShortcutLabel,
  matchesShortcut,
} from "./shortcut";

// ─── Utilities ───────────────────────────────────────────
export { sanitizeUrl, captureContext, captureDeviceInfo, sendReport, sendFeedback, enhanceText } from "./utils";
export { computeSignature, shouldSkipDuplicate, clearDedupCache } from "./dedup";

// ─── Types ───────────────────────────────────────────────
export type {
  CaptureErrorOptions,
  GlitchgrabConfig,
  GlitchgrabProviderProps,
  ReportPayload,
  ReportResult,
  ReportType,
  ReportSeverity,
  CapturedContext,
  DeviceInfo,
  RuntimeInfo,
  Breadcrumb,
  BreadcrumbType,
  UseGlitchgrabReturn,
  ReportButtonProps,
  FeedbackButtonProps,
  FeedbackPayload,
  FeedbackResult,
  GlitchgrabFeedback,
  GlitchgrabSession,
} from "./types";
