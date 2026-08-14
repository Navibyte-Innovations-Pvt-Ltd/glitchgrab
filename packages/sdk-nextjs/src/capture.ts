import type {
  CaptureErrorOptions,
  GlitchgrabSession,
  ReportPayload,
  ReportResult,
} from "./types";
import { captureContext, contextMetadata, sendReport } from "./utils";
import { computeSignature, shouldSkipDuplicate } from "./dedup";
import { incrementErrorCount } from "./runtime";

/**
 * Config the provider publishes so `captureError` works from call sites that
 * cannot reach React context — most importantly `app/global-error.tsx`, which
 * replaces the root layout and therefore renders *outside* the provider tree.
 */
export interface CaptureConfig {
  token: string;
  baseUrl?: string;
  session?: GlitchgrabSession | null;
  ignoreErrors?: (string | RegExp)[];
  /**
   * Read the current visitedPages. A getter, not the array itself: `global-error.tsx`
   * unmounts the provider, and the next provider to mount allocates a fresh ref — a
   * captured array reference would go orphaned and report an empty history for exactly
   * the crashes this module exists to file.
   */
  getVisitedPages: () => string[];
  onError?: (error: Error) => void;
  onReportSent?: (result: ReportResult) => void;
}

let config: CaptureConfig | null = null;

/**
 * Called from the provider's render body (not an effect) so the config exists
 * before children render. A crash during a child's *initial* render unwinds to
 * the framework boundary before any effect commits — registering in an effect
 * would leave `captureError` unconfigured for exactly the case it exists for.
 *
 * Never cleared on unmount: `global-error.tsx` tears down the provider tree.
 */
export function registerCaptureConfig(next: CaptureConfig): void {
  config = next;
}

export function getCaptureConfig(): CaptureConfig | null {
  return config;
}

/** Test-only — reset the module registry between cases. */
export function clearCaptureConfig(): void {
  config = null;
}

export function matchesIgnorePatterns(
  message: string,
  patterns: (string | RegExp)[] | undefined
): boolean {
  if (!patterns || patterns.length === 0) return false;
  return patterns.some((pattern) =>
    pattern instanceof RegExp ? pattern.test(message) : message.includes(pattern)
  );
}

function sessionMetadata(session: GlitchgrabSession | null | undefined): Record<string, string> {
  return {
    ...(session?.userId ? { sessionUserId: session.userId } : {}),
    ...(session?.name ? { sessionUserName: String(session.name) } : {}),
    ...(session?.email ? { sessionUserEmail: String(session.email) } : {}),
    ...(session?.phone ? { sessionUserPhone: String(session.phone) } : {}),
  };
}

/**
 * Build an `SDK_AUTO` payload from an already-caught error, applying dedup.
 * Returns `null` when the error should not be sent (ignored or duplicate).
 */
export function buildCapturedErrorPayload(
  error: unknown,
  options: CaptureErrorOptions | undefined,
  cfg: CaptureConfig,
  capturedBy: string = "captureError"
): ReportPayload | null {
  const err = error instanceof Error ? error : undefined;
  const errorMessage = err ? err.message : String(error);
  if (!errorMessage) return null;

  if (matchesIgnorePatterns(errorMessage, cfg.ignoreErrors)) return null;

  // Counted before the snapshot so the report says which error in the run it is —
  // "errorCount: 7" on a first-seen signature means six crashes already preceded it.
  incrementErrorCount();
  const context = captureContext(cfg.getVisitedPages());
  const digest =
    options?.digest ??
    (typeof (error as { digest?: unknown })?.digest === "string"
      ? (error as { digest: string }).digest
      : undefined);

  const sig = computeSignature({
    errorMessage,
    pageUrl: context.url,
    errorStack: err?.stack,
    digest,
  });
  if (shouldSkipDuplicate(sig)) return null;

  return {
    token: cfg.token,
    source: "SDK_AUTO",
    type: "BUG",
    errorMessage,
    errorStack: err?.stack,
    componentStack: options?.componentStack ?? undefined,
    pageUrl: context.url,
    userAgent: context.userAgent,
    breadcrumbs: context.breadcrumbs,
    deviceInfo: context.deviceInfo ?? undefined,
    metadata: {
      timestamp: context.timestamp,
      visitedPages: JSON.stringify(context.visitedPages),
      capturedBy,
      ...contextMetadata(context),
      ...(options?.boundary ? { boundary: options.boundary } : {}),
      ...(digest ? { digest } : {}),
      ...sessionMetadata(cfg.session),
      ...options?.metadata,
    },
  };
}

/**
 * Report an error your app already caught — a framework error boundary
 * (`app/error.tsx`, `app/global-error.tsx`, React Router `errorElement`, Remix
 * `ErrorBoundary`), a `componentDidCatch`, or a `try/catch` you want filed.
 *
 * These never reach `window.onerror`, so provider auto-capture cannot see them.
 *
 * Fire-and-forget. Never throws, never blocks the fallback UI render. No-ops if
 * no `GlitchgrabProvider` has rendered yet (nothing to authenticate with).
 *
 * @example
 * ```tsx
 * // app/global-error.tsx — renders outside the provider tree
 * "use client";
 * import { captureError } from "glitchgrab";
 *
 * export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
 *   useEffect(() => {
 *     captureError(error, { digest: error.digest, boundary: "next-global-error" });
 *   }, [error]);
 *   return <html><body><p>Something went wrong</p></body></html>;
 * }
 * ```
 */
export function captureError(error: unknown, options?: CaptureErrorOptions): void {
  try {
    const cfg = config;
    if (!cfg?.token) return;

    const payload = buildCapturedErrorPayload(error, options, cfg);
    if (!payload) return;

    void sendReport(payload, cfg.baseUrl).then((result) => {
      if (result && cfg.onReportSent) cfg.onReportSent(result);
    });

    if (cfg.onError && error instanceof Error) cfg.onError(error);
  } catch {
    // Never crash the host app
  }
}
