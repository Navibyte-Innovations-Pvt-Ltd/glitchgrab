"use client";

import {
  createContext,
  useContext,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";
import type {
  CaptureErrorOptions,
  FeedbackResult,
  GlitchgrabProviderProps,
  UseGlitchgrabReturn,
  ReportPayload,
  ReportResult,
  ReportType,
} from "./types";
import { GlitchgrabErrorBoundary } from "./error-boundary";
import { ReportDialog } from "@glitchgrab/report-ui";
import { sanitizeUrl, captureContext, contextMetadata, sendReport, sendFeedback, captureDeviceInfo, enhanceText, transcribeAudio, type EnhanceContext } from "./utils";
import {
  setContext as setContextInternal,
  setContexts as setContextsInternal,
  setRelease,
} from "./app-context";
import { incrementErrorCount } from "./runtime";
import { computeSignature, shouldSkipDuplicate } from "./dedup";
import { describeRejection, isUnactionableRejection } from "./rejection";
import {
  captureError as captureErrorStandalone,
  matchesIgnorePatterns,
  registerCaptureConfig,
} from "./capture";
import { GLITCHGRAB_SHORTCUT, getShortcutLabel, matchesShortcut } from "./shortcut";
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
 * const { reportBug, report, captureError, addBreadcrumb } = useGlitchgrab();
 *
 * // Report a bug
 * reportBug("Login button crashes on mobile");
 *
 * // Report an error your own boundary already caught (e.g. app/error.tsx)
 * captureError(error, { digest: error.digest, boundary: "next-app-router" });
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
  ignoreErrors,
  release,
  context: appContext,
  responseBodyOrigins,
}: GlitchgrabProviderProps) {
  const visitedPagesRef = useRef<string[]>([]);

  // Same reasoning as the capture config below: written during render so a crash
  // on a child's first render still reports which build it came from.
  setRelease(release);
  if (appContext) setContextsInternal(appContext);

  // Publish config for the standalone `captureError` export.
  //
  // Written in the render body, not an effect: a crash during a child's *initial*
  // render unwinds to the framework boundary (Next's `error.tsx`) before any effect
  // commits, so an effect-based registration would leave `captureError` unconfigured
  // for exactly the case it exists to cover. The write is idempotent, so React's
  // strict-mode double-invoke and discarded renders are harmless. Never torn down on
  // unmount — `global-error.tsx` replaces the root layout, provider tree included.
  registerCaptureConfig({
    token,
    baseUrl,
    session,
    ignoreErrors,
    getVisitedPages: () => visitedPagesRef.current,
    onError,
    onReportSent,
  });

  // Initialize breadcrumbs
  useEffect(() => {
    if (enableBreadcrumbs) {
      initBreadcrumbs(maxBreadcrumbs, { responseBodyOrigins });
    }
    // Keyed on the joined origins, not the array — callers pass this inline, and
    // a fresh array identity each render would re-run the effect every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableBreadcrumbs, maxBreadcrumbs, responseBodyOrigins?.join(",")]);

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

      // Well-known extension-injected noise that carries no extension origin in
      // filename/stack, so EXTENSION_ORIGIN_RE can't catch it. Not app bugs.
      const KNOWN_NOISE_RE = [
        /Object Not Found Matching Id:\d+, MethodName:update, ParamCount:\d+/,
      ];

      const matchesIgnore = (message: string): boolean => {
        if (KNOWN_NOISE_RE.some((pattern) => pattern.test(message))) return true;
        return matchesIgnorePatterns(message, ignoreErrors);
      };

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

          // Caller-supplied ignore patterns — known-noisy signatures (e.g. browser
          // extension bridge errors) that aren't app bugs.
          if (matchesIgnore(event.message)) {
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
          // Counted before the snapshot, so a report says which error in the run
          // it was — the fifth crash reads very differently from the first.
          incrementErrorCount();
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
              ...contextMetadata(context),
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
          const reason = event.reason;
          // Non-Error reasons used to stringify to "[object Object]", discarding
          // every field and every chance of a stack.
          const description = describeRejection(reason);
          const errMsg = description.message;
          const errStack = description.stack;

          // Ignore generic cross-origin script errors.
          if (errMsg === "Script error." || errMsg === "Script error") {
            return;
          }

          // Caller-supplied ignore patterns — known-noisy signatures (e.g. browser
          // extension bridge errors) that aren't app bugs.
          if (matchesIgnore(errMsg)) {
            return;
          }

          // Ignore unhandled rejections where the call chain passes through a browser
          // extension — these are the extension's own failures, not the app's.
          if (errStack && EXTENSION_ORIGIN_RE.test(errStack)) return;

          // No message and no stack — nothing a human or an AI could triage. Reporting
          // it only produces issues titled "[object Object]".
          if (isUnactionableRejection(description)) return;

          // Snapshot only once the rejection has survived every filter — an
          // ignored rejection must not inflate errorCount for the next report.
          incrementErrorCount();
          const context = captureContext(visitedPagesRef.current);

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
              ...contextMetadata(context),
              type: "unhandledrejection",
              ...(description.details ? { rejectionReason: description.details } : {}),
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
  }, [token, baseUrl, onError, onReportSent, session, ignoreErrors]);

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
            ...contextMetadata(context),
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

  const feedback = useCallback(
    async (
      rating: number,
      message?: string,
      metadata?: Record<string, string>
    ): Promise<FeedbackResult | null> => {
      try {
        const context = captureContext(visitedPagesRef.current);
        return await sendFeedback(
          {
            token,
            rating,
            message,
            pageUrl: context.url,
            userAgent: context.userAgent,
            metadata: {
              timestamp: context.timestamp,
              ...(session?.userId ? { sessionUserId: session.userId } : {}),
              ...(session?.name ? { sessionUserName: String(session.name) } : {}),
              ...(session?.email ? { sessionUserEmail: String(session.email) } : {}),
              ...(session?.phone ? { sessionUserPhone: String(session.phone) } : {}),
              ...metadata,
            },
          },
          baseUrl
        );
      } catch {
        return null;
      }
    },
    [token, baseUrl, session]
  );

  // One dialog, not two — this opens the same report dialog straight onto its
  // RATING tile. A user answering "what's on your mind?" shouldn't have to know
  // in advance whether their thought is a bug or a compliment.
  const openFeedbackDialog = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("glitchgrab:open-report", { detail: { type: "RATING" } })
      );
    }
  }, []);

  // Stable identity — the documented usage puts this in a `useEffect` dep array.
  // Reads config from the module registry, which this render already refreshed.
  const captureError = useCallback(
    (error: unknown, options?: CaptureErrorOptions) => {
      captureErrorStandalone(error, options);
    },
    []
  );

  const setContext = useCallback((key: string, value: unknown) => {
    setContextInternal(key, value);
  }, []);

  const setContexts = useCallback((values: Record<string, unknown>) => {
    setContextsInternal(values);
  }, []);

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
        if (matchesShortcut(e)) {
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

  // Who the dialog shows as the reporter. `session` is the SDK's identity
  // primitive; the avatar is read off the extra fields GlitchgrabSession allows,
  // since auth libraries name it `image` (NextAuth) or `avatarUrl`.
  const reporter = useMemo(() => {
    if (!session) return null;
    const avatar = session.avatarUrl ?? session.image;
    return {
      name: session.name,
      email: session.email,
      avatarUrl: typeof avatar === "string" ? avatar : null,
    };
  }, [session]);

  // Starts as the non-Mac label so SSR and the first client render agree,
  // then resolves to the real platform label after mount.
  const [shortcutLabel, setShortcutLabel] = useState(GLITCHGRAB_SHORTCUT);
  useEffect(() => {
    setShortcutLabel(getShortcutLabel());
  }, []);

  return (
    <GlitchgrabContext.Provider
      value={{
        token,
        baseUrl: baseUrl ?? DEFAULT_BASE_URL,
        reportBug,
        report,
        captureError,
        setContext,
        setContexts,
        sendFeedback: feedback,
        openFeedbackDialog,
        addBreadcrumb,
        openReportDialog,
        enhanceText: enhance,
        shortcutLabel,
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
      <ReportDialog report={report} sendFeedback={feedback} enhanceText={enhance} transcribeAudio={transcribe} types={types} showSeverity={showSeverity} reporter={reporter} />
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
