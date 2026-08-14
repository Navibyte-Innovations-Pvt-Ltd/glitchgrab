import type { Breadcrumb, BreadcrumbType } from "./types";
import { redactBody } from "./redact";

const MAX_DEFAULT = 50;

let breadcrumbs: Breadcrumb[] = [];
let maxBreadcrumbs = MAX_DEFAULT;
let initialized = false;

/**
 * Extra origins whose error bodies may be captured. Same-origin is always
 * allowed; everything else must be listed explicitly.
 */
let responseBodyOrigins: string[] = [];

export interface BreadcrumbOptions {
  /**
   * Additional origins to capture error response bodies from, e.g.
   * `["https://api.myapp.com"]`. Same-origin requests are always captured.
   */
  responseBodyOrigins?: string[];
}

/**
 * Error response bodies are only read for endpoints the host app owns.
 *
 * A 422 from your own API echoes your own validation errors. A 422 from Stripe,
 * Auth0 or an analytics vendor echoes whatever *they* chose to put in it — dates
 * of birth, phone numbers, addresses — under field names no key-based redactor
 * can anticipate. That body would end up in a GitHub issue. Same-origin is the
 * line that separates "our error shape" from "someone else's payload"; anything
 * beyond it has to be named explicitly.
 */
function mayCaptureBody(url: string): boolean {
  try {
    if (typeof window === "undefined") return false;
    const origin = new URL(url, window.location.href).origin;
    if (origin === window.location.origin) return true;
    return responseBodyOrigins.includes(origin);
  } catch {
    return false;
  }
}

export function initBreadcrumbs(max?: number, options?: BreadcrumbOptions) {
  // Applied before the early return so a later provider can widen the allowlist
  // even though the interceptors are only installed once.
  if (options?.responseBodyOrigins?.length) {
    responseBodyOrigins = Array.from(
      new Set([...responseBodyOrigins, ...options.responseBodyOrigins])
    );
  }
  if (initialized) return;
  maxBreadcrumbs = max ?? MAX_DEFAULT;

  try {
    if (typeof window === "undefined") return;
    interceptConsole();
    interceptFetch();
    interceptXhr();
    interceptNavigation();
    interceptClicks();
    initialized = true;
  } catch {
    // Never crash
  }
}

export function addBreadcrumb(
  type: BreadcrumbType,
  message: string,
  data?: Record<string, string>
) {
  try {
    breadcrumbs.push({
      type,
      message: message.slice(0, 200),
      timestamp: new Date().toISOString(),
      data,
    });
    if (breadcrumbs.length > maxBreadcrumbs) {
      breadcrumbs = breadcrumbs.slice(-maxBreadcrumbs);
    }
  } catch {
    // Never crash
  }
}

export function getBreadcrumbs(): Breadcrumb[] {
  return [...breadcrumbs];
}

export function clearBreadcrumbs() {
  breadcrumbs = [];
}

/** Test-only — reset the cross-origin body allowlist. */
export function clearResponseBodyOrigins() {
  responseBodyOrigins = [];
}

// ─── Console Interception ────────────────────────────────

function interceptConsole() {
  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  console.log = function (...args: unknown[]) {
    addBreadcrumb("console", `[log] ${argsToString(args)}`);
    origLog.apply(console, args);
  };

  console.warn = function (...args: unknown[]) {
    addBreadcrumb("console", `[warn] ${argsToString(args)}`);
    origWarn.apply(console, args);
  };

  console.error = function (...args: unknown[]) {
    addBreadcrumb("console", `[error] ${argsToString(args)}`);
    origError.apply(console, args);
  };
}

function argsToString(args: unknown[]): string {
  try {
    return args
      .map((a) => {
        if (typeof a === "string") return a;
        if (a instanceof Error) return a.message;
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      })
      .join(" ")
      .slice(0, 200);
  } catch {
    return "[unknown]";
  }
}

// ─── HTTP Interception ───────────────────────────────────

/**
 * Read the body of a failed response without consuming it. `clone()` is what
 * makes this safe — the app still gets an unread body. Only non-2xx responses
 * are read: a "→ 500" with no cause is not worth the breadcrumb it's written on,
 * but cloning every successful response would double-buffer real traffic.
 */
async function readErrorBody(response: Response, url: string): Promise<string> {
  try {
    if (response.ok) return "";
    if (!mayCaptureBody(url)) return "";
    const text = await response.clone().text();
    return redactBody(text);
  } catch {
    return "";
  }
}

function interceptFetch() {
  const origFetch = window.fetch;

  (window.fetch as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) = async function (input, init) {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input instanceof Request
            ? input.url
            : String(input);
    const method = init?.method ?? "GET";
    const start = Date.now();

    try {
      const response = await origFetch(
        input as Parameters<typeof origFetch>[0],
        init,
      );
      const body = await readErrorBody(response, url);
      addBreadcrumb("api", `${method} ${url.slice(0, 100)} → ${response.status}`, {
        method,
        status: String(response.status),
        duration: `${Date.now() - start}ms`,
        ...(body ? { responseBody: body } : {}),
      });
      return response;
    } catch (err) {
      addBreadcrumb("api", `${method} ${url.slice(0, 100)} → FAILED`, {
        method,
        error: err instanceof Error ? err.message : "unknown",
        duration: `${Date.now() - start}ms`,
      });
      throw err;
    }
  };
}

/**
 * axios, and every library built on it, uses XMLHttpRequest in the browser — not
 * fetch. Without this patch an axios-based app records zero API breadcrumbs and
 * every report arrives with no idea which request preceded the crash.
 */
function interceptXhr() {
  if (typeof XMLHttpRequest === "undefined") return;

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  interface TrackedXhr extends XMLHttpRequest {
    __ggMethod?: string;
    __ggUrl?: string;
    __ggStart?: number;
    __ggListening?: boolean;
  }

  // The listener is attached on open(), not send(): open() is where the method
  // and URL become known, and an XHR that is opened and then aborted before send
  // still deserves the breadcrumb.
  //
  // XHR objects are reusable — open/send/open/send on one instance is legal, and
  // a library may call open() twice before sending. Attaching per open() would
  // leave a stale listener that fires on the *next* request's loadend and writes
  // a breadcrumb with the previous method and URL. One listener per instance,
  // reading __ggMethod/__ggUrl live, avoids that: it always describes the request
  // that actually just finished.
  XMLHttpRequest.prototype.open = function (
    this: TrackedXhr,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    try {
      this.__ggMethod = method;
      this.__ggUrl = typeof url === "string" ? url : url.toString();

      const record = () => {
        try {
          const recordedMethod = this.__ggMethod ?? "GET";
          const recordedUrl = (this.__ggUrl ?? "").slice(0, 100);
          const duration = `${Date.now() - (this.__ggStart ?? Date.now())}ms`;

          // status 0 means the request never completed — offline, CORS, aborted.
          if (!this.status) {
            addBreadcrumb("api", `${recordedMethod} ${recordedUrl} → FAILED`, {
              method: recordedMethod,
              duration,
            });
            return;
          }

          const failed = this.status < 200 || this.status >= 300;
          const body = failed && mayCaptureBody(this.__ggUrl ?? "") ? readXhrBody(this) : "";
          addBreadcrumb("api", `${recordedMethod} ${recordedUrl} → ${this.status}`, {
            method: recordedMethod,
            status: String(this.status),
            duration,
            ...(body ? { responseBody: body } : {}),
          });
        } catch {
          // Never crash
        }
      };

      if (!this.__ggListening) {
        this.__ggListening = true;
        this.addEventListener("loadend", record);
      }
    } catch {
      // Never crash
    }
    return (origOpen as unknown as (...args: unknown[]) => void).apply(this, [
      method,
      url,
      ...rest,
    ]);
  } as typeof XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.send = function (this: TrackedXhr, ...args: unknown[]) {
    try {
      this.__ggStart = Date.now();
    } catch {
      // Never crash
    }
    return (origSend as unknown as (...args: unknown[]) => void).apply(this, args);
  } as typeof XMLHttpRequest.prototype.send;
}

/**
 * `responseText` throws on a `responseType` of "blob"/"arraybuffer"/"json" —
 * reading it defensively keeps a binary download from breaking the breadcrumb.
 */
function readXhrBody(xhr: XMLHttpRequest): string {
  try {
    if (xhr.responseType && xhr.responseType !== "text" && xhr.responseType !== "json") return "";
    const raw = xhr.responseType === "json" ? JSON.stringify(xhr.response) : xhr.responseText;
    return raw ? redactBody(raw) : "";
  } catch {
    return "";
  }
}

// ─── Navigation Interception ─────────────────────────────

function interceptNavigation() {
  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);

  history.pushState = function (...args) {
    origPush(...args);
    addBreadcrumb("navigation", `Navigate to ${window.location.pathname}`);
  };

  history.replaceState = function (...args) {
    origReplace(...args);
    addBreadcrumb("navigation", `Replace to ${window.location.pathname}`);
  };

  window.addEventListener("popstate", () => {
    addBreadcrumb("navigation", `Back/Forward to ${window.location.pathname}`);
  });
}

// ─── Click Interception ──────────────────────────────────

function interceptClicks() {
  document.addEventListener(
    "click",
    (e) => {
      try {
        const target = e.target as HTMLElement;
        const tag = target.tagName?.toLowerCase();
        const text = target.textContent?.trim().slice(0, 50) ?? "";
        const id = target.id ? `#${target.id}` : "";
        const cls = target.className && typeof target.className === "string"
          ? `.${target.className.split(" ")[0]}`
          : "";

        addBreadcrumb("click", `Click ${tag}${id}${cls} "${text}"`);
      } catch {
        // Never crash
      }
    },
    { capture: true }
  );
}
