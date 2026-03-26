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
import { sanitizeUrl, captureContext, sendReport, captureDeviceInfo } from "./utils";
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

      const handleError = (event: ErrorEvent) => {
        try {
          const context = captureContext(visitedPagesRef.current);
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
          const payload: ReportPayload = {
            token,
            source: "SDK_AUTO",
            type: "BUG",
            errorMessage: reason instanceof Error ? reason.message : String(reason),
            errorStack: reason instanceof Error ? reason.stack : undefined,
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
  }, [token, baseUrl, onError, onReportSent]);

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
    [token, baseUrl, onReportSent]
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

  return (
    <GlitchgrabContext.Provider
      value={{
        token,
        baseUrl: baseUrl ?? DEFAULT_BASE_URL,
        reportBug,
        report,
        addBreadcrumb,
      }}
    >
      <GlitchgrabErrorBoundary
        token={token}
        baseUrl={baseUrl}
        onError={onError}
        fallback={fallback}
        visitedPages={visitedPagesRef.current}
      >
        {children}
      </GlitchgrabErrorBoundary>
    </GlitchgrabContext.Provider>
  );
}

export function GlitchgrabProvider(props: GlitchgrabProviderProps) {
  // No token = passthrough (SDK disabled)
  if (!props.token) return <>{props.children}</>;

  // Auto-detect baseUrl from window.location if not provided
  const resolvedProps = {
    ...props,
    baseUrl: props.baseUrl || (typeof window !== "undefined" ? window.location.origin : DEFAULT_BASE_URL),
  };

  try {
    return <GlitchgrabProviderInner {...resolvedProps} />;
  } catch {
    return <>{props.children}</>;
  }
}
