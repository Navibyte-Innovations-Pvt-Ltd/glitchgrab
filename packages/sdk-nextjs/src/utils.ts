import type {
  CapturedContext,
  DeviceInfo,
  FeedbackPayload,
  FeedbackResult,
  ReportPayload,
  ReportResult,
} from "./types";
import { getBreadcrumbs } from "./breadcrumbs";
import { captureRuntimeInfo } from "./runtime";
import { getAppContext, getRelease } from "./app-context";

const SENSITIVE_PARAMS = [
  "token", "key", "secret", "password", "passwd", "auth", "authorization",
  "session", "sessionid", "session_id", "api_key", "apikey", "access_token",
  "refresh_token", "client_secret", "code", "state", "nonce", "credential", "private",
];

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const params = new URLSearchParams(parsed.search);
    let modified = false;
    for (const key of Array.from(params.keys())) {
      if (SENSITIVE_PARAMS.some((s) => key.toLowerCase().includes(s))) {
        params.set(key, "[REDACTED]");
        modified = true;
      }
    }
    if (modified) parsed.search = params.toString();
    return parsed.toString();
  } catch {
    return url.split("?")[0] ?? url;
  }
}

export function captureDeviceInfo(): DeviceInfo | null {
  try {
    if (typeof window === "undefined") return null;
    return {
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      platform: navigator.platform ?? "unknown",
      language: navigator.language ?? "unknown",
      online: navigator.onLine,
      colorScheme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      devicePixelRatio: window.devicePixelRatio ?? 1,
    };
  } catch {
    return null;
  }
}

export function captureContext(visitedPages: string[]): CapturedContext {
  try {
    return {
      url: sanitizeUrl(typeof window !== "undefined" ? window.location.href : ""),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      timestamp: new Date().toISOString(),
      visitedPages: visitedPages.map(sanitizeUrl),
      breadcrumbs: getBreadcrumbs(),
      deviceInfo: captureDeviceInfo(),
      runtime: captureRuntimeInfo(),
      appContext: getAppContext(),
      release: getRelease(),
    };
  } catch {
    return {
      url: "",
      userAgent: "",
      timestamp: new Date().toISOString(),
      visitedPages: [],
      breadcrumbs: [],
      deviceInfo: null,
      runtime: null,
      appContext: {},
    };
  }
}

/**
 * Metadata every report carries regardless of how it was raised — release,
 * runtime health, and the host app's own context. One builder so a user-filed
 * report and an auto-captured crash describe the same world; the payload sites
 * only add what is specific to them.
 *
 * App context is prefixed so a key named `timestamp` or `status` can't quietly
 * overwrite a field the dashboard relies on.
 */
export function contextMetadata(context: CapturedContext): Record<string, string> {
  try {
    const runtime = context.runtime;
    const appContext = Object.entries(context.appContext ?? {}).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        acc[`ctx_${key}`] = value;
        return acc;
      },
      {}
    );

    return {
      ...(context.release ? { release: context.release } : {}),
      ...(runtime
        ? {
            timeOnPageMs: String(runtime.timeOnPageMs),
            errorCount: String(runtime.errorCount),
            visibility: runtime.visibility,
            ...(runtime.jsHeapUsedMb !== undefined
              ? { jsHeapUsedMb: String(runtime.jsHeapUsedMb) }
              : {}),
            ...(runtime.jsHeapLimitMb !== undefined
              ? { jsHeapLimitMb: String(runtime.jsHeapLimitMb) }
              : {}),
            ...(runtime.connectionType ? { connectionType: runtime.connectionType } : {}),
            ...(runtime.downlinkMbps !== undefined
              ? { downlinkMbps: String(runtime.downlinkMbps) }
              : {}),
            ...(runtime.rttMs !== undefined ? { rttMs: String(runtime.rttMs) } : {}),
            ...(runtime.saveData !== undefined ? { saveData: String(runtime.saveData) } : {}),
          }
        : {}),
      ...appContext,
    };
  } catch {
    return {};
  }
}

const DEFAULT_BASE_URL = "https://glitchgrab.dev";
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 500;

/**
 * Send a report and return the result.
 * Never throws — returns null on failure.
 */
export async function sendReport(
  payload: ReportPayload,
  baseUrl?: string
): Promise<ReportResult | null> {
  try {
    const url = `${baseUrl ?? DEFAULT_BASE_URL}/api/v1/sdk/report`;
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${payload.token}`,
    };

    // keepalive has a 64KB body limit in browsers — skip it for large payloads (e.g., screenshots)
    const useKeepalive = body.length < 60_000;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body,
          ...(useKeepalive ? { keepalive: true } : {}),
        });

        if (response.ok) {
          const envelope = (await response.json()) as {
            success: boolean;
            data?: Omit<ReportResult, "success">;
          };
          return { success: envelope.success, ...(envelope.data ?? {}) };
        }

        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return null;
        }
      } catch {
        // Will retry
      }

      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_BASE_MS * Math.pow(2, attempt))
        );
      }
    }

    // Fallback: sendBeacon (fire-and-forget, no result)
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      try {
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      } catch {
        // Silently fail
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Save a star rating your end-user left about your app.
 * Never throws — returns null on failure.
 *
 * Unlike `sendReport`, this is always a deliberate user action with a dialog
 * open in front of them, so it retries on transient failure but skips the
 * sendBeacon fallback: the caller needs a real result to show a thank-you.
 */
export async function sendFeedback(
  payload: FeedbackPayload,
  baseUrl?: string
): Promise<FeedbackResult | null> {
  try {
    const url = `${baseUrl ?? DEFAULT_BASE_URL}/api/v1/sdk/feedback`;
    const body = JSON.stringify(payload);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${payload.token}`,
          },
          body,
        });

        if (response.ok) {
          const envelope = (await response.json()) as {
            success: boolean;
            data?: Omit<FeedbackResult, "success">;
          };
          return { success: envelope.success, ...(envelope.data ?? {}) };
        }

        // 4xx other than rate limiting is a caller mistake — retrying won't help.
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return null;
        }
      } catch {
        // Will retry
      }

      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_BASE_MS * Math.pow(2, attempt))
        );
      }
    }

    return null;
  } catch {
    return null;
  }
}

export interface EnhanceContext {
  url?: string;
  visitedPages?: string[];
  breadcrumbs?: Array<{ type: string; message: string }>;
}

/**
 * Polish raw description text via the Glitchgrab AI enhance endpoint.
 * Returns the polished text on success, or the original text on any failure.
 * Never throws.
 */
export async function enhanceText(
  text: string,
  token: string,
  baseUrl?: string,
  screenshot?: string | null,
  context?: EnhanceContext | null
): Promise<string> {
  try {
    const trimmed = text.trim();
    if (!trimmed) return text;
    const url = `${baseUrl ?? DEFAULT_BASE_URL}/api/v1/ai/enhance-text`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text: trimmed,
        ...(screenshot ? { screenshot } : {}),
        ...(context ? { context } : {}),
      }),
    });
    if (!response.ok) return text;
    const envelope = (await response.json()) as {
      success: boolean;
      data?: { text?: string };
    };
    if (envelope?.success && typeof envelope.data?.text === "string") {
      return envelope.data.text;
    }
    return text;
  } catch {
    return text;
  }
}

/**
 * One turn of the AI report assistant (#330).
 *
 * Same never-throw contract as everything else in the SDK: a failure comes back
 * as `degraded` and the dialog quietly falls back to the plain form. An
 * end-user of the host app must never see a Glitchgrab error, and must never be
 * blocked from filing a bug because a model was busy.
 */
export async function assistTurn(
  params: {
    messages: { role: "user" | "assistant"; content: string }[];
    conversationId: string | null;
    screenshot?: string | null;
    context?: Record<string, unknown> | null;
  },
  token: string,
  baseUrl?: string
): Promise<{
  conversationId: string | null;
  question: string | null;
  report: string | null;
  degraded?: string | null;
}> {
  const offline = {
    conversationId: null,
    question: null,
    report: null,
    degraded:
      "The assistant is unavailable — write your report below and send it as normal.",
  };
  try {
    const url = `${baseUrl ?? DEFAULT_BASE_URL}/api/v1/ai/report-chat`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    const envelope = (await response.json().catch(() => null)) as {
      success?: boolean;
      error?: string;
      degrade?: boolean;
      disabled?: boolean;
      data?: { conversationId?: string; question?: string | null; report?: string | null };
    } | null;

    if (!response.ok || !envelope?.success) {
      // The server distinguishes "cannot help" (cap, rate limit, model down,
      // switched off) from a bug. Either way the dialog does the same thing —
      // but the reason is the server's to word, so pass it through.
      return {
        conversationId: null,
        question: null,
        report: null,
        degraded: envelope?.error ?? offline.degraded,
      };
    }

    return {
      conversationId: envelope.data?.conversationId ?? null,
      question: envelope.data?.question ?? null,
      report: envelope.data?.report ?? null,
      degraded: null,
    };
  } catch {
    return offline;
  }
}

/**
 * Send an audio Blob to the Glitchgrab STT proxy (which calls Sarvam).
 * Returns the transcript string, or "" on any failure. Never throws.
 */
export async function transcribeAudio(
  blob: Blob,
  token: string,
  baseUrl?: string
): Promise<string> {
  try {
    if (blob.size === 0) return "";
    const url = `${baseUrl ?? DEFAULT_BASE_URL}/api/v1/sdk/stt`;
    const form = new FormData();
    form.append("file", blob, "audio.webm");
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!response.ok) return "";
    const envelope = (await response.json()) as {
      success: boolean;
      data?: { transcript?: string };
    };
    if (envelope?.success && typeof envelope.data?.transcript === "string") {
      return envelope.data.transcript;
    }
    return "";
  } catch {
    return "";
  }
}
