/**
 * Server-side reporting — `import { reportServerError } from "glitchgrab/server"`.
 *
 * The rest of this SDK is `"use client"`: it hooks `window.onerror`, walks the
 * DOM for a screenshot, and needs a mounted provider for its token. None of
 * that exists in a cron job at 3am, an API route handler, or a queue worker —
 * which is precisely where the failures nobody is watching happen. A WhatsApp
 * send Meta rejects, an SMTP timeout, a nightly digest that throws: no tab is
 * open, so the browser SDK never sees them and no issue is ever filed.
 *
 * This entry has no `"use client"`, touches no DOM API, and imports no React.
 * It POSTs to the same `/api/v1/sdk/report` endpoint the browser uses, with
 * `source: "SDK_AUTO"` so the server-side dedup applies (24h per signature,
 * 7 days once an issue exists) — otherwise a cron failing hourly would open
 * twenty-four identical issues a day.
 *
 * Like the rest of the SDK it never throws: a reporting failure must not turn
 * a handled error into an unhandled one.
 */
import type { ReportPayload, ReportResult, ReportSeverity, ReportType } from "./types";
import { sendReport } from "./utils";

/** Who to attribute the report to. A server has no signed-in user, so this is the job or service. */
export interface ServerReporterIdentity {
  /** Stable id — the cron name, the service name. Defaults to `"server"`. */
  id?: string;
  /** Display name shown on the report. Defaults to `"Server"`. */
  name?: string;
  email?: string;
  phone?: string;
}

/** Defaults applied to every server report. Set once at boot with {@link configureServerReporter}. */
export interface ServerReporterConfig {
  /** Repo token (`gg_…`). Falls back to `process.env.GLITCHGRAB_TOKEN`. */
  token?: string;
  /** Override the API host. Falls back to `process.env.GLITCHGRAB_BASE_URL`, then `https://glitchgrab.dev`. */
  baseUrl?: string;
  /**
   * Where this ran — `"cron/attendance-prompts"`, `"worker/email-queue"`.
   *
   * It is the grouping key, not a link: it is sent as the report's `pageUrl`
   * so two different jobs throwing the same `"Timeout"` stay two issues
   * instead of collapsing into one.
   */
  context?: string;
  /** Merged into every report's metadata. Good place for region, deployment id, service name. */
  metadata?: Record<string, string>;
  reporter?: ServerReporterIdentity;
  /**
   * Report from `NODE_ENV=development` too. Off by default, matching the
   * browser SDK — a laptop crashing its way through a refactor should not file
   * issues. Unlike the browser there is no `Origin` header for the API to
   * recognise, so nothing else stops a dev machine from filing.
   */
  enableInDevelopment?: boolean;
}

/** Per-call options. Anything set here wins over {@link configureServerReporter}. */
export interface ServerReportOptions extends ServerReporterConfig {
  /** Issue type. Defaults to `BUG`. */
  type?: ReportType;
  /** Rendered as a `severity:<value>` label on the GitHub issue. */
  severity?: ReportSeverity;
  /** Extra prose for the issue body — what the job was doing, which record it was on. */
  description?: string;
  /**
   * A real request URL, when there is one (an API route handler). Overrides
   * the synthetic URL built from `context`.
   */
  pageUrl?: string;
}

const DEV_BLOCKED_MESSAGE = "development";

/**
 * Node's `process`, as much of it as this file uses.
 *
 * `src/global.d.ts` declares a browser-shaped `process` with nothing but
 * `env`, and that is deliberate — the client bundle must not be able to reach
 * for Node APIs. So this entry reads the real one off `globalThis` behind its
 * own narrow type instead of pulling `@types/node` into the package.
 */
interface NodeProcessLike {
  env?: Record<string, string | undefined>;
  version?: string;
  on?(event: string, listener: (arg: never) => void): unknown;
  off?(event: string, listener: (arg: never) => void): unknown;
  listenerCount?(event: string): number;
}

function nodeProcess(): NodeProcessLike | undefined {
  try {
    const candidate = (globalThis as { process?: NodeProcessLike }).process;
    return candidate && typeof candidate === "object" ? candidate : undefined;
  } catch {
    return undefined;
  }
}

let defaults: ServerReporterConfig = {};

/**
 * Set the token and the defaults once, at module load, instead of passing them
 * to every call site. A later call's own options still win.
 */
export function configureServerReporter(config: ServerReporterConfig): void {
  defaults = { ...defaults, ...config };
}

/** Test-only — drop everything {@link configureServerReporter} set. */
export function resetServerReporter(): void {
  defaults = {};
}

function readEnv(name: string): string | undefined {
  try {
    return nodeProcess()?.env?.[name];
  } catch {
    return undefined;
  }
}

/**
 * Message and stack out of whatever was thrown.
 *
 * A thrown string, a rejected `{ code, message }`, an `undefined` from a
 * `Promise.reject()` — all of it reaches here, and all of it must produce a
 * non-empty message: the API's dedup signature is `null` without one, and a
 * report with no signature is a fresh issue every single time.
 */
function describeError(error: unknown): { message: string; stack?: string } {
  try {
    if (error instanceof Error) {
      return {
        message: error.message || error.name || "Unknown server error",
        stack: error.stack,
      };
    }
    if (typeof error === "string") {
      return { message: error || "Unknown server error" };
    }
    if (error && typeof error === "object") {
      const maybe = error as { message?: unknown; stack?: unknown };
      const message = typeof maybe.message === "string" ? maybe.message : JSON.stringify(error);
      return {
        message: message || "Unknown server error",
        stack: typeof maybe.stack === "string" ? maybe.stack : undefined,
      };
    }
    return { message: String(error ?? "") || "Unknown server error" };
  } catch {
    return { message: "Unknown server error" };
  }
}

/**
 * `pageUrl` doubles as the dedup grouping key, so a job needs one even though
 * no page was involved. `server://` keeps it obviously synthetic — and keeps it
 * clear of the API's localhost check, which only matches http(s) and would
 * otherwise swallow the report with a 200 and create nothing.
 */
function contextUrl(context: string | undefined): string | undefined {
  if (!context) return undefined;
  return `server://${context.replace(/^\/+/, "")}`;
}

function runtimeMetadata(): Record<string, string> {
  try {
    const proc = nodeProcess();
    if (!proc) return { runtime: "server" };
    const region = proc.env?.VERCEL_REGION;
    const deploymentEnv = proc.env?.VERCEL_ENV;
    return {
      runtime: "node",
      ...(proc.version ? { nodeVersion: proc.version } : {}),
      ...(region ? { region } : {}),
      ...(deploymentEnv ? { deploymentEnv } : {}),
    };
  } catch {
    return { runtime: "server" };
  }
}

/**
 * File a server-side error as a GitHub issue.
 *
 * Await it. On a serverless platform the function may be frozen the moment your
 * handler returns, and a floating promise dies with it — the report never
 * leaves the machine.
 *
 * ```ts
 * try {
 *   await sendDigest();
 * } catch (error) {
 *   await reportServerError(error, { context: "cron/daily-digest" });
 *   throw error;
 * }
 * ```
 *
 * Returns `null` when nothing was filed — no token, development mode, or the
 * API refused it. Never throws.
 */
export async function reportServerError(
  error: unknown,
  options: ServerReportOptions = {}
): Promise<ReportResult | null> {
  try {
    const token = options.token ?? defaults.token ?? readEnv("GLITCHGRAB_TOKEN");
    if (!token) return null;

    const enableInDevelopment = options.enableInDevelopment ?? defaults.enableInDevelopment ?? false;
    if (!enableInDevelopment && readEnv("NODE_ENV") === DEV_BLOCKED_MESSAGE) return null;

    const { message, stack } = describeError(error);
    const context = options.context ?? defaults.context;
    const reporter = { ...defaults.reporter, ...options.reporter };

    const payload: ReportPayload = {
      token,
      source: "SDK_AUTO",
      type: options.type ?? "BUG",
      errorMessage: message,
      ...(stack ? { errorStack: stack } : {}),
      ...(options.description ? { description: options.description } : {}),
      ...(options.pageUrl ?? contextUrl(context)
        ? { pageUrl: options.pageUrl ?? contextUrl(context) }
        : {}),
      metadata: {
        ...runtimeMetadata(),
        ...defaults.metadata,
        ...options.metadata,
        ...(context ? { serverContext: context } : {}),
        ...(options.severity ? { severity: options.severity } : {}),
        sessionUserId: reporter.id ?? context ?? "server",
        sessionUserName: reporter.name ?? "Server",
        ...(reporter.email ? { sessionUserEmail: reporter.email } : {}),
        ...(reporter.phone ? { sessionUserPhone: reporter.phone } : {}),
      },
    };

    return await sendReport(payload, options.baseUrl ?? defaults.baseUrl ?? readEnv("GLITCHGRAB_BASE_URL"));
  } catch {
    return null;
  }
}

/** Options for {@link captureServerErrors}. */
export interface CaptureServerErrorsOptions extends ServerReportOptions {
  /**
   * Also report rejected promises nobody handled. Default `true`.
   *
   * Node crashes the process on an unhandled rejection — but only while no
   * `unhandledRejection` listener exists. Attaching one silently converts a
   * crash into a warning, so this re-throws afterwards to put the default
   * behaviour back, unless the host app has its own listener (then it is theirs
   * to decide).
   */
  captureUnhandledRejections?: boolean;
}

/**
 * Report every uncaught exception and unhandled rejection in this process.
 *
 * Call it once at boot — `instrumentation.ts` in a Next.js app. Returns a
 * function that removes the listeners again.
 *
 * Uncaught exceptions use `uncaughtExceptionMonitor`, which observes without
 * taking over: the process still crashes exactly as it would have. A reporter
 * that keeps a broken process alive is worse than no reporter.
 */
export function captureServerErrors(options: CaptureServerErrorsOptions = {}): () => void {
  try {
    const proc = nodeProcess();
    if (!proc || typeof proc.on !== "function") return () => {};

    const onException = (error: unknown) => {
      void reportServerError(error, { ...options, context: options.context ?? "uncaughtException" });
    };

    const onRejection = (reason: unknown) => {
      void reportServerError(reason, {
        ...options,
        context: options.context ?? "unhandledRejection",
      });

      // Ours is the only listener, so suppressing the crash was never the
      // host app's choice. Hand the default behaviour back.
      if (proc.listenerCount?.("unhandledRejection") === 1) {
        setTimeout(() => {
          throw reason;
        }, 0);
      }
    };

    proc.on("uncaughtExceptionMonitor", onException as (arg: never) => void);

    const captureRejections = options.captureUnhandledRejections ?? true;
    if (captureRejections) proc.on("unhandledRejection", onRejection as (arg: never) => void);

    return () => {
      try {
        proc.off?.("uncaughtExceptionMonitor", onException as (arg: never) => void);
        if (captureRejections) {
          proc.off?.("unhandledRejection", onRejection as (arg: never) => void);
        }
      } catch {
        // Nothing to undo.
      }
    };
  } catch {
    return () => {};
  }
}

export type { ReportResult, ReportSeverity, ReportType } from "./types";
