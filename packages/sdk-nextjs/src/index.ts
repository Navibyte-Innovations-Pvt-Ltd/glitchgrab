"use client";

// ─── Core (required) ─────────────────────────────────────
export { GlitchgrabProvider, useGlitchgrab } from "./provider";

// ─── Optional Components ─────────────────────────────────
export { ReportButton } from "./report-button";
export { GlitchgrabErrorBoundary } from "./error-boundary";

// ─── Hooks ──────────────────────────────────────────────
export { useGlitchgrabReports, fetchGlitchgrabReports, useGlitchgrabActions } from "./use-reports";
export type { GlitchgrabReport } from "./use-reports";

// ─── Breadcrumbs ─────────────────────────────────────────
export {
  addBreadcrumb,
  getBreadcrumbs,
  clearBreadcrumbs,
  initBreadcrumbs,
} from "./breadcrumbs";

// ─── Utilities ───────────────────────────────────────────
export { sanitizeUrl, captureContext, captureDeviceInfo, sendReport } from "./utils";

// ─── Types ───────────────────────────────────────────────
export type {
  GlitchgrabConfig,
  GlitchgrabProviderProps,
  ReportPayload,
  ReportResult,
  ReportType,
  ReportSeverity,
  CapturedContext,
  DeviceInfo,
  Breadcrumb,
  BreadcrumbType,
  UseGlitchgrabReturn,
  ReportButtonProps,
  GlitchgrabSession,
} from "./types";
