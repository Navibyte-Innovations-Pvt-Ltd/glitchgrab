import type { Breadcrumb, BreadcrumbType } from "./types";

const MAX_DEFAULT = 50;

let breadcrumbs: Breadcrumb[] = [];
let maxBreadcrumbs = MAX_DEFAULT;
let initialized = false;

export function initBreadcrumbs(max?: number) {
  if (initialized) return;
  maxBreadcrumbs = max ?? MAX_DEFAULT;

  try {
    if (typeof window === "undefined") return;
    interceptConsole();
    interceptFetch();
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

// ─── Fetch Interception ──────────────────────────────────

function interceptFetch() {
  const origFetch = window.fetch;

  window.fetch = async function (input, init) {
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
      const response = await origFetch.apply(window, [input, init]);
      addBreadcrumb("api", `${method} ${url.slice(0, 100)} → ${response.status}`, {
        method,
        status: String(response.status),
        duration: `${Date.now() - start}ms`,
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
