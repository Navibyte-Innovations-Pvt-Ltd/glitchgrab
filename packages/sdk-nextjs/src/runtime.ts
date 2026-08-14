import type { RuntimeInfo } from "./types";

/**
 * Runtime health at the moment of the crash. `deviceInfo` says what the machine
 * is; this says what shape it was in — a leak that ran the heap to its ceiling,
 * a 2G connection that starved a fetch, a bug that only shows up after ten
 * minutes on the page or on the fifth error in a row.
 */

const pageLoadedAt = Date.now();
let errorCount = 0;

/** Bumped by every auto-captured error so a report says which one in the run it was. */
export function incrementErrorCount(): number {
  errorCount += 1;
  return errorCount;
}

export function getErrorCount(): number {
  return errorCount;
}

/** Test-only — reset the per-session counter. */
export function resetErrorCount(): void {
  errorCount = 0;
}

interface MemoryCapableWindow {
  memory?: { usedJSHeapSize?: number; jsHeapSizeLimit?: number };
}

interface NetworkInformation {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

const toMb = (bytes: number | undefined): number | undefined =>
  typeof bytes === "number" ? Math.round((bytes / 1048576) * 10) / 10 : undefined;

export function captureRuntimeInfo(): RuntimeInfo | null {
  try {
    if (typeof window === "undefined") return null;

    // Chromium-only, and absent entirely under cross-origin isolation.
    const memory = (performance as unknown as MemoryCapableWindow)?.memory;
    // Chromium + Android only.
    const connection = (navigator as unknown as { connection?: NetworkInformation })?.connection;

    return {
      timeOnPageMs: Date.now() - pageLoadedAt,
      errorCount,
      visibility: typeof document !== "undefined" ? document.visibilityState : "unknown",
      ...(memory
        ? {
            jsHeapUsedMb: toMb(memory.usedJSHeapSize),
            jsHeapLimitMb: toMb(memory.jsHeapSizeLimit),
          }
        : {}),
      ...(connection
        ? {
            connectionType: connection.effectiveType,
            downlinkMbps: connection.downlink,
            rttMs: connection.rtt,
            saveData: connection.saveData,
          }
        : {}),
    };
  } catch {
    return null;
  }
}
