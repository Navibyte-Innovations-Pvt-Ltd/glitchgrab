"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useEffect,
  useCallback,
} from "react";
import type { GlitchgrabProviderProps, UseGlitchgrabReturn, ReportPayload } from "./types";
import { GlitchgrabErrorBoundary } from "./error-boundary";
import { sanitizeUrl, captureContext, sendReport } from "./utils";

const DEFAULT_BASE_URL = "https://glitchgrab.dev";

const GlitchgrabContext = createContext<UseGlitchgrabReturn | null>(null);

/**
 * Hook to access Glitchgrab in your components.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { reportBug } = useGlitchgrab();
 *   return <button onClick={() => reportBug("Something broke")}>Report</button>;
 * }
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
  baseUrl,
  onError,
  children,
  fallback,
}: GlitchgrabProviderProps) {
  const visitedPagesRef = useRef<string[]>([]);

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
            // Keep only last 20 pages
            if (pages.length > 20) {
              pages.splice(0, pages.length - 20);
            }
          }
        } catch {
          // Silently fail
        }
      };

      // Track initial page
      trackPage();

      // Listen for route changes (works with Next.js client-side navigation)
      const handlePopState = () => trackPage();
      window.addEventListener("popstate", handlePopState);

      // Intercept pushState/replaceState for SPA navigation
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

  // Listen for unhandled errors and rejections
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const handleError = (event: ErrorEvent) => {
        try {
          const context = captureContext(visitedPagesRef.current);
          const payload: ReportPayload = {
            token,
            source: "SDK_AUTO",
            errorMessage: event.message,
            errorStack: event.error?.stack,
            pageUrl: context.url,
            userAgent: context.userAgent,
            metadata: {
              timestamp: context.timestamp,
              visitedPages: JSON.stringify(context.visitedPages),
              filename: event.filename ?? "",
              lineno: String(event.lineno ?? ""),
              colno: String(event.colno ?? ""),
            },
          };
          sendReport(payload, baseUrl);
          if (onError && event.error) {
            onError(event.error);
          }
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
            errorMessage:
              reason instanceof Error
                ? reason.message
                : String(reason),
            errorStack:
              reason instanceof Error ? reason.stack : undefined,
            pageUrl: context.url,
            userAgent: context.userAgent,
            metadata: {
              timestamp: context.timestamp,
              visitedPages: JSON.stringify(context.visitedPages),
              type: "unhandledrejection",
            },
          };
          sendReport(payload, baseUrl);
          if (onError && reason instanceof Error) {
            onError(reason);
          }
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
  }, [token, baseUrl, onError]);

  const reportBug = useCallback(
    (description: string, metadata?: Record<string, string>) => {
      try {
        const context = captureContext(visitedPagesRef.current);
        const payload: ReportPayload = {
          token,
          source: "SDK_USER_REPORT",
          description,
          pageUrl: context.url,
          userAgent: context.userAgent,
          metadata: {
            timestamp: context.timestamp,
            visitedPages: JSON.stringify(context.visitedPages),
            ...metadata,
          },
        };
        sendReport(payload, baseUrl);
      } catch {
        // Silently fail
      }
    },
    [token, baseUrl]
  );

  return (
    <GlitchgrabContext.Provider value={{ token, baseUrl: baseUrl ?? DEFAULT_BASE_URL, reportBug }}>
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
  try {
    return <GlitchgrabProviderInner {...props} />;
  } catch {
    // If the provider itself fails, render children without error tracking
    return <>{props.children}</>;
  }
}
