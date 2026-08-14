/**
 * App-owned context: key-values the host app attaches once and every report
 * carries thereafter — orgId, plan, role, active feature flags. The SDK cannot
 * guess these, and they are usually the difference between "a crash" and "a
 * crash for enterprise tenants on the new billing flow".
 *
 * Module-level, not React state, so it survives the provider unmount that
 * `global-error.tsx` causes and is readable from non-React call sites.
 */

const MAX_KEYS = 30;
const MAX_VALUE_LENGTH = 200;

let appContext: Record<string, string> = {};
let release: string | undefined;

function coerce(value: unknown): string {
  if (typeof value === "string") return value.slice(0, MAX_VALUE_LENGTH);
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value).slice(0, MAX_VALUE_LENGTH);
  } catch {
    return String(value).slice(0, MAX_VALUE_LENGTH);
  }
}

/**
 * Attach one key-value to every future report. Passing `null`/`undefined`
 * removes the key — so a value that goes away (user logs out of an org) stops
 * being reported instead of going stale.
 */
export function setContext(key: string, value: unknown): void {
  try {
    if (!key) return;
    if (value === null || value === undefined) {
      delete appContext[key];
      return;
    }
    if (!(key in appContext) && Object.keys(appContext).length >= MAX_KEYS) return;
    appContext[key] = coerce(value);
  } catch {
    // Never crash the host app
  }
}

/** Set several keys at once. Merges — it does not replace what's already set. */
export function setContexts(values: Record<string, unknown>): void {
  try {
    for (const [key, value] of Object.entries(values ?? {})) setContext(key, value);
  } catch {
    // Never crash the host app
  }
}

export function getAppContext(): Record<string, string> {
  return { ...appContext };
}

export function clearAppContext(): void {
  appContext = {};
}

/**
 * The build this crash came from. Explicit `release` prop wins; otherwise the
 * standard Vercel/Next build env vars, which bundlers inline at build time.
 */
export function setRelease(value: string | undefined): void {
  if (value) release = value;
}

export function getRelease(): string | undefined {
  if (release) return release;
  try {
    const fromEnv =
      process.env.NEXT_PUBLIC_APP_VERSION ||
      process.env.NEXT_PUBLIC_RELEASE ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
    return fromEnv || undefined;
  } catch {
    return undefined;
  }
}

/** Test-only — reset release resolution between cases. */
export function clearRelease(): void {
  release = undefined;
}
