"use client";

import {
  createContext,
  useContext,
  useRef,
  useEffect,
  useCallback,
  useState,
} from "react";
import type {
  GlitchgrabProviderProps,
  UseGlitchgrabReturn,
  ReportPayload,
  ReportResult,
  ReportType,
} from "./types";
import { GlitchgrabErrorBoundary } from "./error-boundary";
import { ReportDialog } from "./report-dialog";
import { sanitizeUrl, captureContext, sendReport, captureDeviceInfo, enhanceText, transcribeAudio, type EnhanceContext } from "./utils";
import { computeSignature, shouldSkipDuplicate } from "./dedup";
import {
  initBreadcrumbs,
  addBreadcrumb as addBreadcrumbInternal,
  getBreadcrumbs,
} from "./breadcrumbs";

const DEFAULT_BASE_URL = "https://glitchgrab.dev";

const GlitchgrabContext = createContext<UseGlitchgrabReturn | null>(null);

/**
 * Hook to access Glitchgrab in your components.
 *
 * @example
 * ```tsx
 * const { reportBug, report, addBreadcrumb } = useGlitchgrab();
 *
 * // Report a bug
 * reportBug("Login button crashes on mobile");
 *
 * // Report a feature request
 * report("FEATURE_REQUEST", "Add dark mode");
 *
 * // Add a custom breadcrumb
 * addBreadcrumb("User clicked checkout", { cartItems: "3" });
 * ```
 */
export function useGlitchgrab(): UseGlitchgrabReturn {
  const ctx = useContext(GlitchgrabContext);
  if (!ctx) {
    throw new Error("useGlitchgrab must be used within a GlitchgrabProvider");
  }
  return ctx;
}

function GlitchgrabProviderInner({
  token,
  session,
  baseUrl,
  onError,
  onReportSent,
  breadcrumbs: enableBreadcrumbs = true,
  maxBreadcrumbs = 50,
  children,
  fallback,
  types,
  showSeverity,
}: GlitchgrabProviderProps) {
  const visitedPagesRef = useRef<string[]>([]);

  // Initialize breadcrumbs
  useEffect(() => {
    if (enableBreadcrumbs) {
      initBreadcrumbs(maxBreadcrumbs);
    }
  }, [enableBreadcrumbs, maxBreadcrumbs]);

  // Track page visits
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const trackPage = () => {
        try {
          const sanitized = sanitizeUrl(window.location.href);
          const pages = visitedPagesRef.current;
          if (pages[pages.length - 1] !== sanitized) {
            pages.push(sanitized);
            if (pages.length > 20) {
              pages.splice(0, pages.length - 20);
            }
          }
        } catch {
          // Silently fail
        }
      };

      trackPage();
      const handlePopState = () => trackPage();
      window.addEventListener("popstate", handlePopState);

      const origPushState = history.pushState.bind(history);
      const origReplaceState = history.replaceState.bind(history);

      history.pushState = function (...args) {
        origPushState(...args);
        trackPage();
      };
      history.replaceState = function (...args) {
        origReplaceState(...args);
        trackPage();
      };

      return () => {
        window.removeEventListener("popstate", handlePopState);
        history.pushState = origPushState;
        history.replaceState = origReplaceState;
      };
    } catch {
      // Never crash
    }
  }, []);

  // Unhandled errors and rejections — skip in development
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (process.env.NODE_ENV === "development") return;

      // Matches chrome-extension://, safari-extension://, moz-extension://
      const EXTENSION_ORIGIN_RE = /\b(?:chrome|safari|moz)-extension:\/\//;

      const handleError = (event: ErrorEvent) => {
        try {
          // Ignore opaque cross-origin script errors — the browser masks these with no
          // stack, no filename, and no error object, so there is nothing actionable to report.
          const isOpaqueCrossOrigin =
            event.message === "Script error." ||
            event.message === "Script error" ||
            (!event.error && !event.filename);
          if (isOpaqueCrossOrigin) {
            return;
          }

          // Ignore benign ResizeObserver warnings — these are triggered by UI libraries
          // (Radix, cmdk, etc.) and are not actionable bugs.
          if (
            event.message === "ResizeObserver loop completed with undelivered notifications." ||
            event.message === "ResizeObserver loop limit exceeded"
          ) {
            return;
          }

          // Ignore errors thrown by browser extensions — crypto wallets, ad blockers,
          // and other extensions run in the page's JS context but are not part of the app.
          if (
            (event.filename && EXTENSION_ORIGIN_RE.test(event.filename)) ||
            (event.error?.stack && EXTENSION_ORIGIN_RE.test(event.error.stack))
          ) {
            return;
          }
          const context = captureContext(visitedPagesRef.current);
          const sig = computeSignature({
            errorMessage: event.message,
            pageUrl: context.url,
            errorStack: event.error?.stack,
          });
          if (shouldSkipDuplicate(sig)) return;
          const payload: ReportPayload = {
            token,
            source: "SDK_AUTO",
            type: "BUG",
            errorMessage: event.message,
            errorStack: event.error?.stack,
            pageUrl: context.url,
            userAgent: context.userAgent,
            breadcrumbs: context.breadcrumbs,
            deviceInfo: context.deviceInfo ?? undefined,
            metadata: {
              timestamp: context.timestamp,
              visitedPages: JSON.stringify(context.visitedPages),
              filename: event.filename ?? "",
              lineno: String(event.lineno ?? ""),
              colno: String(event.colno ?? ""),
              ...(session?.userId ? { sessionUserId: session.userId } : {}),
              ...(session?.name ? { sessionUserName: String(session.name) } : {}),
              ...(session?.email ? { sessionUserEmail: String(session.email) } : {}),
              ...(session?.phone ? { sessionUserPhone: String(session.phone) } : {}),
            },
          };
          sendReport(payload, baseUrl).then((result) => {
            if (result && onReportSent) onReportSent(result);
          });
          if (onError && event.error) onError(event.error);
        } catch {
          // Silently fail
        }
      };

      const handleRejection = (event: PromiseRejectionEvent) => {
        try {
          const context = captureContext(visitedPagesRef.current);
          const reason = event.reason;
          const errMsg = reason instanceof Error ? reason.message : String(reason);
          // Ignore generic cross-origin script errors.
          if (errMsg === "Script error." || errMsg === "Script error") {
            return;
          }
          const errStack = reason instanceof Error ? reason.stack : undefined;

          // Ignore unhandled rejections where the call chain passes through a browser
          // extension — these are the extension's own failures, not the app's.
          if (errStack && EXTENSION_ORIGIN_RE.test(errStack)) return;

          const sig = computeSignature({
            errorMessage: errMsg,
            pageUrl: context.url,
            errorStack: errStack,
          });
          if (shouldSkipDuplicate(sig)) return;
          const payload: ReportPayload = {
            token,
            source: "SDK_AUTO",
            type: "BUG",
            errorMessage: errMsg,
            errorStack: errStack,
            pageUrl: context.url,
            userAgent: context.userAgent,
            breadcrumbs: context.breadcrumbs,
            deviceInfo: context.deviceInfo ?? undefined,
            metadata: {
              timestamp: context.timestamp,
              visitedPages: JSON.stringify(context.visitedPages),
              type: "unhandledrejection",
              ...(session?.userId ? { sessionUserId: session.userId } : {}),
              ...(session?.name ? { sessionUserName: String(session.name) } : {}),
              ...(session?.email ? { sessionUserEmail: String(session.email) } : {}),
              ...(session?.phone ? { sessionUserPhone: String(session.phone) } : {}),
            },
          };
          sendReport(payload, baseUrl).then((result) => {
            if (result && onReportSent) onReportSent(result);
          });
          if (onError && reason instanceof Error) onError(reason);
        } catch {
          // Silently fail
        }
      };

      window.addEventListener("error", handleError);
      window.addEventListener("unhandledrejection", handleRejection);

      return () => {
        window.removeEventListener("error", handleError);
        window.removeEventListener("unhandledrejection", handleRejection);
      };
    } catch {
      // Never crash
    }
  }, [token, baseUrl, onError, onReportSent, session]);

  const report = useCallback(
    async (
      type: ReportType,
      description: string,
      metadata?: Record<string, string>
    ): Promise<ReportResult | null> => {
      try {
        const context = captureContext(visitedPagesRef.current);
        const payload: ReportPayload = {
          token,
          source: "SDK_USER_REPORT",
          type,
          description,
          pageUrl: context.url,
          userAgent: context.userAgent,
          breadcrumbs: context.breadcrumbs,
          deviceInfo: context.deviceInfo ?? undefined,
          metadata: {
            timestamp: context.timestamp,
            visitedPages: JSON.stringify(context.visitedPages),
            ...(session?.userId ? { sessionUserId: session.userId } : {}),
            ...(session?.name ? { sessionUserName: String(session.name) } : {}),
            ...(session?.email ? { sessionUserEmail: String(session.email) } : {}),
            ...(session?.phone ? { sessionUserPhone: String(session.phone) } : {}),
            ...metadata,
          },
        };
        const result = await sendReport(payload, baseUrl);
        if (result && onReportSent) onReportSent(result);
        return result;
      } catch {
        return null;
      }
    },
    [token, baseUrl, onReportSent, session]
  );

  const reportBug = useCallback(
    (description: string, metadata?: Record<string, string>) =>
      report("BUG", description, metadata),
    [report]
  );

  const addBreadcrumb = useCallback(
    (message: string, data?: Record<string, string>) => {
      addBreadcrumbInternal("custom", message, data);
    },
    []
  );

  const enhance = useCallback(
    async (text: string, screenshot?: string | null): Promise<string> => {
      try {
        const ctx = captureContext(visitedPagesRef.current);
        const context: EnhanceContext = {
          url: ctx.url,
          visitedPages: ctx.visitedPages.slice(-5),
          breadcrumbs: ctx.breadcrumbs.slice(-10).map((b) => ({ type: b.type, message: b.message })),
        };
        return await enhanceText(text, token, baseUrl, screenshot, context);
      } catch {
        return text;
      }
    },
    [token, baseUrl]
  );

  const transcribe = useCallback(
    async (blob: Blob): Promise<string> => {
      try {
        return await transcribeAudio(blob, token, baseUrl);
      } catch {
        return "";
      }
    },
    [token, baseUrl]
  );

  const openReportDialog = useCallback((options?: { description?: string; type?: ReportType }) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("glitchgrab:open-report", { detail: options }));
    }
  }, []);

  // Global keyboard shortcut: Cmd+Shift+G (Mac) / Ctrl+Shift+G (Windows/Linux)
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "g") {
          e.preventDefault();
          openReportDialog();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    } catch {
      // Never crash
    }
  }, [openReportDialog]);

  return (
    <GlitchgrabContext.Provider
      value={{
        token,
        baseUrl: baseUrl ?? DEFAULT_BASE_URL,
        reportBug,
        report,
        addBreadcrumb,
        openReportDialog,
        enhanceText: enhance,
      }}
    >
      <GlitchgrabErrorBoundary
        token={token}
        baseUrl={baseUrl}
        session={session}
        onError={onError}
        fallback={fallback}
        visitedPages={visitedPagesRef.current}
      >
        {children}
      </GlitchgrabErrorBoundary>
      <ReportDialog report={report} enhanceText={enhance} transcribeAudio={transcribe} types={types} showSeverity={showSeverity} />
    </GlitchgrabContext.Provider>
  );
}

export function GlitchgrabProvider(props: GlitchgrabProviderProps) {
  // No token = passthrough (SDK disabled)
  if (!props.token) return <>{props.children}</>;

  const resolvedProps = {
    ...props,
    baseUrl: props.baseUrl || DEFAULT_BASE_URL,
  };

  try {
    return <GlitchgrabProviderInner {...resolvedProps} />;
  } catch {
    return <>{props.children}</>;
  }
}
