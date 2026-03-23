// ─── Core (required) ─────────────────────────────────────
export { GlitchgrabProvider, useGlitchgrab } from "./provider";

// ─── Optional Components ─────────────────────────────────
export { ReportButton } from "./report-button";
export { GlitchgrabErrorBoundary } from "./error-boundary";

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
  CapturedContext,
  DeviceInfo,
  Breadcrumb,
  BreadcrumbType,
  UseGlitchgrabReturn,
  ReportButtonProps,
} from "./types";
