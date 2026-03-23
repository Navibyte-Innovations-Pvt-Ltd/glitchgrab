import type { ReportPayload, ReportResult, CapturedContext, DeviceInfo } from "./types";
import { getBreadcrumbs } from "./breadcrumbs";

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
    };
  } catch {
    return {
      url: "",
      userAgent: "",
      timestamp: new Date().toISOString(),
      visitedPages: [],
      breadcrumbs: [],
      deviceInfo: null,
    };
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

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body,
          keepalive: true,
        });

        if (response.ok) {
          const data = (await response.json()) as { success: boolean; data?: ReportResult };
          return data.data ?? { success: data.success };
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
