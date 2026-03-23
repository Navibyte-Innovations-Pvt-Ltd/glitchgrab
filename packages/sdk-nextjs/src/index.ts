// ─── Core (required) ─────────────────────────────────────
export { GlitchgrabProvider, useGlitchgrab } from "./provider";

// ─── Optional Components ─────────────────────────────────
export { ReportButton } from "./report-button";
export { GlitchgrabErrorBoundary } from "./error-boundary";

// ─── Utilities (for advanced usage) ──────────────────────
export { sanitizeUrl, captureContext, sendReport } from "./utils";

// ─── Types ───────────────────────────────────────────────
export type {
  GlitchgrabConfig,
  GlitchgrabProviderProps,
  ReportPayload,
  CapturedContext,
  UseGlitchgrabReturn,
} from "./types";
