import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import { chromium } from "playwright-core";

/**
 * Sign the bot into Google from inside the container (#311).
 *
 * Why this exists, after two simpler approaches failed:
 *
 *  1. Automating the login → Google blocks it outright ("This browser or app
 *     may not be secure"). That check is on the sign-in page specifically and
 *     is not worth fighting.
 *  2. Exporting cookies from your laptop → the exporter silently dropped the
 *     httpOnly sign-in cookies, and even with them the session was minted in
 *     India and replayed from a Singapore datacenter, which Google treats as
 *     suspicious.
 *
 * So: run an ordinary Chrome here, in the container, and let a human drive it
 * over VNC. Nothing is automated during the login, so Google sees a normal
 * browser — and the session is created on the same IP that will later use it.
 * The profile lives on a mounted volume, so it keeps renewing itself instead
 * of decaying from a snapshot.
 *
 * The browser only exists while you are logging in. `stop()` kills it, and it
 * self-terminates after {@link SESSION_TIMEOUT_MS} so a forgotten session can't
 * sit there exposed.
 */

/** Chrome profile directory. Point this at a mounted volume to make it persist. */
export const PROFILE_DIR = process.env.GOOGLE_PROFILE_DIR ?? "/data/chrome-profile";

/** X display the login browser and VNC server share. */
const DISPLAY = ":99";

/** A forgotten login session is a remote-controlled browser nobody is watching. */
const SESSION_TIMEOUT_MS = 20 * 60 * 1000;

interface LoginSession {
  procs: ChildProcess[];
  startedAt: number;
  timer: ReturnType<typeof setTimeout>;
}

let session: LoginSession | null = null;

export function isLoginActive(): boolean {
  return session !== null;
}

export function loginStatus() {
  return {
    active: session !== null,
    startedAt: session?.startedAt ?? null,
    expiresInSec: session
      ? Math.max(0, Math.round((SESSION_TIMEOUT_MS - (Date.now() - session.startedAt)) / 1000))
      : null,
    profileDir: PROFILE_DIR,
  };
}

/** True once a Chrome profile exists on disk — i.e. someone has logged in. */
export async function hasProfile(): Promise<boolean> {
  try {
    const info = await stat(PROFILE_DIR);
    return info.isDirectory();
  } catch {
    return false;
  }
}

function run(command: string, args: string[], env?: Record<string, string>): ChildProcess {
  const proc = spawn(command, args, {
    env: { ...process.env, DISPLAY, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  proc.stdout?.on("data", (c: Buffer) => console.log(`[${command}]`, c.toString().trim()));
  proc.stderr?.on("data", (c: Buffer) => console.log(`[${command}]`, c.toString().trim()));
  return proc;
}

/**
 * Boot an X display, a VNC server and a plain Chrome.
 *
 * Chrome is launched straight from the shell — NOT through Playwright. That is
 * the entire point: no `--enable-automation`, no CDP port, nothing for Google's
 * sign-in page to object to.
 */
export async function startLogin(vncPassword: string): Promise<{ ok: boolean; error?: string }> {
  if (session) return { ok: false, error: "A login session is already running" };
  if (!vncPassword || vncPassword.length < 8) {
    return { ok: false, error: "VNC_PASSWORD must be set to at least 8 characters" };
  }

  await mkdir(PROFILE_DIR, { recursive: true }).catch(() => {});

  const procs: ChildProcess[] = [];

  try {
    procs.push(run("Xvfb", [DISPLAY, "-screen", "0", "1280x800x24", "-nolisten", "tcp"]));
    await new Promise((r) => setTimeout(r, 2000));

    // Binds all interfaces on purpose — Railway's TCP proxy has to reach it.
    // The exposure is gated by the VNC password, by the session only existing
    // while you are logging in, and by the proxy being one you added and can
    // delete.
    procs.push(
      run("x11vnc", [
        "-display", DISPLAY,
        "-forever",
        "-shared",
        "-rfbport", "5900",
        "-passwd", vncPassword,
        "-noxdamage",
        "-quiet",
      ])
    );

    // The same Chromium binary Playwright would use, resolved from Playwright
    // itself so it tracks the image — but spawned by hand, so it carries none
    // of the automation flags that get a sign-in blocked.
    procs.push(
      run(chromium.executablePath(), [
        `--user-data-dir=${PROFILE_DIR}`,
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-default-browser-check",
        "--window-size=1280,800",
        "--window-position=0,0",
        "https://accounts.google.com/",
      ])
    );

    const timer = setTimeout(() => {
      console.log("[bot] login session timed out — shutting the browser down");
      void stopLogin();
    }, SESSION_TIMEOUT_MS);

    session = { procs, startedAt: Date.now(), timer };
    console.log("[bot] login session started — connect over VNC to finish signing in");

    return { ok: true };
  } catch (err) {
    for (const p of procs) p.kill("SIGKILL");
    return { ok: false, error: err instanceof Error ? err.message : "Could not start login" };
  }
}

/**
 * Tear the login session down.
 *
 * The profile directory survives — that is the whole product of this exercise.
 * Only the browser and the remote view go away.
 */
export async function stopLogin(): Promise<{ ok: boolean }> {
  if (!session) return { ok: true };

  clearTimeout(session.timer);
  // Chrome first, so it flushes its profile to disk before X disappears.
  for (const proc of [...session.procs].reverse()) {
    try {
      proc.kill("SIGTERM");
    } catch {
      /* already gone */
    }
  }

  await new Promise((r) => setTimeout(r, 2000));
  for (const proc of session.procs) {
    if (proc.exitCode === null) proc.kill("SIGKILL");
  }

  session = null;
  console.log("[bot] login session stopped — profile kept");
  return { ok: true };
}
