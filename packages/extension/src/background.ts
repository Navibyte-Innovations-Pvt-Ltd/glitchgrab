// Session state
interface CaptureState {
  active: boolean;
  startedAt: number | null;
  events: CaptureEvent[];
  sessionId: string | null;
  fromBridge: boolean; // started via GlitchRecord bridge (WS) vs manual hotkey
}

export interface CaptureEvent {
  type: "click" | "navigate" | "idle" | "input" | "select" | "keydown" | "scroll" | "copy" | "paste" | "note";
  t: number; // ms from capture start
  label?: string;
  tag?: string;
  url?: string;
  durationMs?: number;
  preview?: string; // input events: truncated field value
  meta?: Record<string, string>; // rich element descriptor (tag, role, icon, href, section, selector…)
  note?: string; // "note" events: "explain this" marker from the annotate hotkey
  client?: string; // which Chrome profile produced this — set on the bridge side from clientId
}

// Stable per-profile id so the bridge can merge events from multiple Chrome
// profiles into one timeline AND tell them apart (admin profile vs student
// profile). Persisted in this profile's storage; generated once on first run.
let clientId = "";
async function initClientId() {
  try {
    const { gg_client_id } = await chrome.storage.local.get("gg_client_id");
    if (typeof gg_client_id === "string" && gg_client_id) {
      clientId = gg_client_id;
      return;
    }
    clientId = crypto.randomUUID().split("-")[0]; // 8 hex chars, e.g. "a1b2c3d4"
    await chrome.storage.local.set({ gg_client_id: clientId });
  } catch {
    clientId = clientId || "default";
  }
}
initClientId();

const state: CaptureState = {
  active: false,
  startedAt: null,
  events: [],
  sessionId: null,
  fromBridge: false,
};

// ── Debug log relay ───────────────────────────────────────────
// Background logs live in the service-worker console (hard to inspect).
// Mirror them into every page console (prefixed [GG-bg]) so they can be
// read alongside content-script logs from a single tab.
function log(...args: unknown[]) {
  console.log(...args);
  const text = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  // 1. Mirror into page consoles (readable via a watcher tab)
  try {
    chrome.tabs.query({ url: ["http://*/*", "https://*/*"] }, (tabs) => {
      for (const t of tabs) {
        if (t.id) chrome.tabs.sendMessage(t.id, { type: "GG_LOG", text }).catch(() => {});
      }
    });
  } catch { /* no tabs */ }
  // 2. Forward to GlitchRecord so it lands in the unified debug log file
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "log", text }));
    }
  } catch { /* ws not ready */ }
}

log("[GG] Background service worker started");

// ── Reinject content script into already-open tabs ────────────
// On install/update/SW-start, existing tabs still run the OLD (now orphaned)
// content script. Reinject the fresh one so those tabs can capture again.
// The content script's single-instance ping guard prevents double-registration
// on tabs that already have a live instance.
let reinjectedOnce = false;
function reinjectAllTabs() {
  if (reinjectedOnce) return; // run at most once per worker — avoid stacking instances
  reinjectedOnce = true;
  chrome.tabs.query({ url: ["http://*/*", "https://*/*"] }, (tabs) => {
    for (const tab of tabs) {
      if (!tab.id) continue;
      chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: false },
        files: ["content.js"],
      }).catch(() => { /* restricted page (chrome://, web store) — skip */ });
    }
  });
}
// Only on install/update — the manifest content_scripts already covers normal
// page loads, so reinjecting on every startup just stacks duplicate instances.
chrome.runtime.onInstalled.addListener(reinjectAllTabs);

// ── GlitchRecord WebSocket connection ────────────────────────
// GlitchRecord runs a WS server on 7337. Chrome ext connects for real-time sync.
const BRIDGE_WS = "ws://localhost:7337?role=chrome";
let ws: WebSocket | null = null;
let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Reconnect delay, doubling on each failure.
 *
 * GlitchRecord is usually NOT running — most people only use the extension for
 * meeting recording. A fixed 3s retry then means ~1200 failed WebSocket
 * attempts an hour, each one a red error in chrome://extensions. That noise
 * buries real errors, which is worse than the reconnect being a few seconds
 * slower when GlitchRecord does start.
 */
const BRIDGE_RETRY_MIN_MS = 3000;
const BRIDGE_RETRY_MAX_MS = 60_000;
let bridgeRetryMs = BRIDGE_RETRY_MIN_MS;

function scheduleBridgeRetry() {
  if (wsReconnectTimer) return; // a retry is already pending
  wsReconnectTimer = setTimeout(() => {
    wsReconnectTimer = null;
    connectBridge();
  }, bridgeRetryMs);
  bridgeRetryMs = Math.min(bridgeRetryMs * 2, BRIDGE_RETRY_MAX_MS);
}

function connectBridge() {
  if (ws && ws.readyState < 2) return; // already open/connecting
  try {
    ws = new WebSocket(BRIDGE_WS);

    ws.onopen = () => {
      log("[GG] Bridge connected");
      if (wsReconnectTimer) { clearTimeout(wsReconnectTimer); wsReconnectTimer = null; }
      // GlitchRecord is up — go back to reconnecting promptly if it drops.
      bridgeRetryMs = BRIDGE_RETRY_MIN_MS;
      sendTesterIdentityToBridge();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as { type: string; sessionId?: string; script?: string; issueUrl?: string; startedAt?: number };
        if (msg.type === "recording:start") {
          log("[GG] Bridge → recording:start");
          startCapture(msg.sessionId, msg.startedAt);
        } else if (msg.type === "recording:stop") {
          log("[GG] Bridge → recording:stop");
          stopCapture();
        } else if (msg.type === "script:ready") {
          state.sessionId = msg.sessionId ?? null;
          broadcastState();
        } else if (msg.type === "issue:created") {
          console.log("[GG] Issue created:", msg.issueUrl);
        }
      } catch { /* bad json */ }
    };

    ws.onclose = () => {
      log(`[GG] Bridge disconnected — retry in ${Math.round(bridgeRetryMs / 1000)}s`);
      ws = null;
      // GlitchRecord quit mid-recording — stop capture so extension doesn't record forever
      if (state.active && state.fromBridge) {
        log("[GG] Bridge closed while recording — stopping capture");
        stopCapture();
      }
      scheduleBridgeRetry();
    };

    ws.onerror = () => { ws?.close(); };
  } catch {
    scheduleBridgeRetry();
  }
}

connectBridge();

// ── Tester login (work-time tracking + bug attribution, #297) ────
// A tester pastes their gg_ token + name/email once in the popup. That opens
// an ExtensionSession on the backend (its duration = "tester work time" in
// the dashboard audit log) and the identity rides along on every WS message
// so GlitchRecord can tag the eventual GitHub issue as EXTENSION_TESTER.
// Fallback only — every real login sets tester.apiBase from the trusted
// origin the handshake actually came from (dev vs prod). A stale
// chrome.storage entry from before this fix won't have it; default to prod.
const DEFAULT_API_BASE = "https://glitchgrab.dev";
const HEARTBEAT_INTERVAL_MS = 60_000;

// content.ts already checks event.origin before relaying TESTER_AUTO_LOGIN,
// but background.ts is the component that actually MAKES authenticated
// fetches to apiBase — re-validate here too (defense in depth), so a bug in
// content.ts or a future sender that skips that check can't point an
// authenticated session's fetches at an arbitrary origin.
const ALLOWED_API_BASES = new Set(["https://glitchgrab.dev", "http://localhost:3000"]);
function resolveApiBase(candidate: string | undefined): string {
  return candidate && ALLOWED_API_BASES.has(candidate) ? candidate : DEFAULT_API_BASE;
}

interface TesterAuth {
  // Set only for the manual popup login (paste a gg_ token). Absent for a QA
  // magic-link auto-login — that session is already created server-side and
  // its id alone authenticates ping/end (see extension/session/[id] routes).
  token?: string;
  name: string;
  email?: string;
  sessionId: string;
  loginAt: number;
  // The origin the login came from (https://glitchgrab.dev or
  // http://localhost:3000) — the session only exists in THAT backend's DB,
  // so every follow-up call (ping/end/repos/report) must target it too.
  apiBase: string;
}

let tester: TesterAuth | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function authHeaders(): Record<string, string> {
  return tester?.token ? { Authorization: `Bearer ${tester.token}` } : {};
}

function startHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    if (!tester) return;
    fetch(`${tester.apiBase}/api/v1/extension/session/${tester.sessionId}/ping`, {
      method: "POST",
      headers: authHeaders(),
    }).catch(() => { /* best-effort — a missed ping just shortens counted work time */ });
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
}

function sendTesterIdentityToBridge() {
  if (!tester || !ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    type: "tester:identity",
    name: tester.name,
    email: tester.email,
    sessionId: tester.sessionId,
  }));
}

/**
 * Resolves once the stored session has been read.
 *
 * The MV3 worker is killed constantly, and restoring auth is async. Anything
 * that arrives during that window sees `tester === null` and reports "not
 * logged in" — which is why the pill worked intermittently rather than never.
 * Handlers await this instead of racing it.
 */
let authReady: Promise<void>;

async function restoreTesterAuth() {
  try {
    const { gg_tester } = await chrome.storage.local.get("gg_tester");
    log(`[GG] restoreTesterAuth: stored session ${gg_tester ? "found" : "MISSING — not logged in"}`);
    if (gg_tester && typeof gg_tester === "object" && (gg_tester as TesterAuth).sessionId) {
      const stored = gg_tester as TesterAuth;
      tester = { ...stored, apiBase: resolveApiBase(stored.apiBase) };
      startHeartbeat();
      sendTesterIdentityToBridge();
    }
  } catch { /* ignore */ }
}
authReady = restoreTesterAuth();

// Silent login from the QA magic-link handshake (#297) — the ExtensionSession
// already exists server-side (created by /api/v1/qa/extension-auth), so this
// just adopts it locally. No token involved.
async function testerAutoLogin(sessionId: string, name: string, email: string | undefined, apiBase: string) {
  tester = { name, email, sessionId, loginAt: Date.now(), apiBase };
  await chrome.storage.local.set({ gg_tester: tester, gg_api_base: apiBase });
  startHeartbeat();
  sendTesterIdentityToBridge();
  log("[GG] Tester auto-logged in via", apiBase, ":", name);
}

/**
 * Forget a session the server has stopped recognising.
 *
 * A stored id that no longer resolves — dev database reset, session ended
 * elsewhere — fails every feature separately: repos won't load, reports 401,
 * the Meet pill says "not logged in". None of those say the one thing that
 * fixes it. Clearing it means the next visit to the dashboard silently mints a
 * fresh one.
 */
async function forgetDeadSession(reason: string) {
  log(`[GG] session no longer valid (${reason}) — clearing it`);
  tester = null;
  stopHeartbeat();
  await chrome.storage.local.remove("gg_tester");
}


/**
 * Get a session without needing a dashboard tab to be open and freshly loaded.
 *
 * Until now the only way in was the page handshake: the dashboard posts its
 * session id, a content script relays it. That breaks in the ordinary case —
 * reload the extension and every existing content script is orphaned, so the
 * relay is dead until the user happens to reload the dashboard too. The result
 * was a browser that is signed in to Glitchgrab, an extension that says "not
 * logged in", and nothing on screen connecting the two.
 *
 * The worker can just ask for itself: `/extension/auto-auth` authenticates
 * from the NextAuth cookie, and host permissions mean this request carries it.
 * Same credential the page uses, one fewer moving part.
 */
const AUTO_AUTH_RETRY_MS = 30_000;
let lastAutoAuthAttempt = 0;

async function ensureSession(): Promise<boolean> {
  await authReady;
  if (tester) return true;

  // Don't hammer it: every failure is a request per feature per poll.
  if (Date.now() - lastAutoAuthAttempt < AUTO_AUTH_RETRY_MS) return false;
  lastAutoAuthAttempt = Date.now();

  const { gg_api_base } = await chrome.storage.local.get("gg_api_base");
  // Whichever backend last worked, then production, then a local dev server —
  // deduped so a stored base isn't tried twice.
  const candidates = [...new Set([gg_api_base as string | undefined, DEFAULT_API_BASE, "http://localhost:3000"].filter(Boolean))] as string[];

  for (const apiBase of candidates) {
    try {
      const res = await fetch(`${apiBase}/api/v1/extension/auto-auth`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) continue;

      const json = (await res.json()) as {
        success?: boolean;
        data?: { sessionId?: string; testerName?: string; testerEmail?: string };
      };
      if (!json.success || !json.data?.sessionId) continue;

      tester = {
        name: json.data.testerName ?? "Glitchgrab user",
        email: json.data.testerEmail,
        sessionId: json.data.sessionId,
        loginAt: Date.now(),
        apiBase,
      };
      await chrome.storage.local.set({ gg_tester: tester, gg_api_base: apiBase });
      startHeartbeat();
      sendTesterIdentityToBridge();
      log(`[GG] signed in from the browser's own session via ${apiBase}`);
      return true;
    } catch {
      // Not reachable (dev server down, offline) — try the next one.
    }
  }

  log("[GG] no Glitchgrab session — sign in at glitchgrab.dev in this browser");
  return false;
}

async function testerLogout() {
  if (tester) {
    try {
      await fetch(`${tester.apiBase}/api/v1/extension/session/${tester.sessionId}/end`, {
        method: "POST",
        headers: authHeaders(),
      });
    } catch { /* best-effort — stale session just stops accruing at its last ping */ }
  }
  tester = null;
  stopHeartbeat();
  await chrome.storage.local.remove("gg_tester");
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "tester:logout" }));
  }
  log("[GG] Tester logged out");
}

// Keepalive: the MV3 worker sleeps when idle, so a recording that STARTS while it
// is asleep gets picked up late (the bridge can't push to a dead worker) — the
// first seconds then capture nothing. A periodic alarm wakes the worker to
// (re)connect to the bridge, bounding that gap. Chrome wakes a terminated worker
// to fire the alarm. The content-script heartbeat port covers the fast path.
try {
  chrome.alarms.create("gg-keepalive", { periodInMinutes: 0.5 });
  chrome.alarms.onAlarm.addListener((a) => {
    // Don't call connectBridge here unconditionally: that would bypass the
    // backoff and restore the every-30s error spam.
    if (a.name === "gg-keepalive" && !wsReconnectTimer) connectBridge();
  });
} catch { /* alarms unavailable */ }

// Reconcile the toolbar icon on every service-worker (re)start. The MV3 worker is
// ephemeral: if it dies mid-recording, in-memory state resets to inactive but
// Chrome KEEPS the last icon (red dot). Fresh worker = not recording, so clear the
// dot. Self-heals a red icon left stuck by a worker that died before stopCapture.
if (!state.active) setRecordingIcon(false);

// Fallback signal polling (HTTP) used only when bridge is offline.
// Runs in background service worker — no "Extension context invalidated" risk.
const SIGNAL_URL = "http://localhost:3000/api/v1/capture-signal";
let lastSignalAt = 0;

setInterval(() => {
  if (ws && ws.readyState === WebSocket.OPEN) return; // bridge is primary
  fetch(SIGNAL_URL, { cache: "no-store" })
    .then(r => r.json())
    .then((data: { signal: string; signalAt: number }) => {
      if (data.signalAt <= lastSignalAt) return;
      lastSignalAt = data.signalAt;
      log("[GG] Signal changed →", data.signal);
      if (data.signal === "start" && !state.active) startCapture();
      else if (data.signal === "stop") {
        // Always clear the icon on a stop signal — even if state.active is false
        // (the MV3 worker may have restarted mid-recording and lost in-memory
        // state, but Chrome kept the red icon). Otherwise stopCapture() is gated
        // out and the icon stays red forever.
        if (state.active) stopCapture();
        else setRecordingIcon(false);
      }
    })
    .catch(() => {});
}, 600);


// ── Report a bug from any page (⌘⇧G) ─────────────────────────
//
// The SDK gives this shortcut to apps that embed it. The extension gives it to
// every other page — someone else's dashboard, a staging site, Google Meet —
// where there is no SDK to embed and, until now, no way to file the bug
// without leaving the page and describing it from memory.
//

/**
 * Shrink a tab screenshot until the report dialog will actually accept it.
 *
 * `captureVisibleTab` returns a full-resolution PNG — on a retina display that
 * is several megabytes, and the dialog drops anything over ~1.8 MB. The result
 * was a report window that opened with no screenshot and no explanation, which
 * looked like capture had failed when it had in fact succeeded and been thrown
 * away downstream.
 *
 * JPEG rather than PNG: this is a photograph of a screen, not line art, and the
 * difference is an order of magnitude in size for no visible loss.
 */
const MAX_SCREENSHOT_CHARS = 1_700_000;
const MAX_SCREENSHOT_WIDTH = 1600;

async function shrinkScreenshot(dataUrl: string): Promise<string> {
  if (dataUrl.length <= MAX_SCREENSHOT_CHARS) return dataUrl;

  try {
    const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());

    // Two rounds: at a sane width, then half that if quality alone wasn't enough.
    for (const widthCap of [MAX_SCREENSHOT_WIDTH, MAX_SCREENSHOT_WIDTH / 2]) {
      const scale = Math.min(1, widthCap / bitmap.width);
      const canvas = new OffscreenCanvas(
        Math.round(bitmap.width * scale),
        Math.round(bitmap.height * scale)
      );
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.85, 0.75, 0.6]) {
        const blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
        const encoded = await blobToDataUrl(blob);
        if (encoded.length <= MAX_SCREENSHOT_CHARS) {
          log(`[GG] report: screenshot ${Math.round(dataUrl.length / 1024)}KB → ${Math.round(encoded.length / 1024)}KB`);
          return encoded;
        }
      }
    }
  } catch (err) {
    log(`[GG] report: could not re-encode the screenshot — ${err instanceof Error ? err.message : String(err)}`);
  }

  return dataUrl;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// The dialog renders in an IFRAME overlaid on the page, not a separate window.
// A window drags you out of the thing you are reporting; an iframe pointing at
// an extension page keeps the bug on screen behind it while still giving the
// React UI its own document, so it cannot collide with the host's styles and
// the host cannot read it.
//
// This only PREPARES the report: the screenshot must be taken from the
// background (`chrome.tabs.captureVisibleTab` cannot run in a page) and before
// the overlay mounts, or the screenshot is of our own dialog.
async function prepareReport(tab: chrome.tabs.Tab, context: {
  consoleErrors?: string[];
  client?: { userAgent?: string; platform?: string; viewport?: string };
}) {
  await ensureSession();

  if (!tester) {
    log("[GG] report: not logged in — nothing to report against");
    return { ok: false, error: "Sign in to Glitchgrab in this browser, then try again" };
  }

  // Captured BEFORE the report window opens and steals focus, or the
  // screenshot is of our own empty window instead of the bug.
  let screenshotDataUrl: string | null = null;
  try {
    const raw = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    log(`[GG] report: captured ${raw ? Math.round(raw.length / 1024) + "KB" : "nothing"}`);
    screenshotDataUrl = raw ? await shrinkScreenshot(raw) : null;
  } catch (err) {
    // chrome:// pages, the web store, and PDFs refuse capture. Worth reporting
    // without a screenshot rather than not at all.
    log(`[GG] report: screenshot unavailable — ${err instanceof Error ? err.message : String(err)}`);
  }

  await chrome.storage.local.set({
    gg_pending_report: {
      sessionId: tester.sessionId,
      apiBase: tester.apiBase,
      screenshotDataUrl,
      pageUrl: tab.url ?? null,
      pageTitle: tab.title ?? null,
      targetWindowId: tab.windowId ?? null,
      consoleErrors: context.consoleErrors ?? [],
      client: context.client ?? {},
    },
  });

  log(`[GG] report: prepared for ${tab.url ?? "unknown page"}`);
  return { ok: true, url: chrome.runtime.getURL("report/report.html") };
}

// Toggle capture on hotkey
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-capture") {
    if (state.active) {
      stopCapture();
    } else {
      startCapture();
    }
  }
});

// Accept heartbeat ports from content scripts (they use these to detect context invalidation)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "gg-heartbeat") return;
  // Keep the port alive; content script's onDisconnect fires when SW dies or ext reloads
});

// Re-arm capture on tabs that finish loading DURING a recording. A full-page
// navigation or a new tab loads a fresh content script that missed the one-time
// CAPTURE_START broadcast — without this it would capture nothing.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!state.active) return;
  if (changeInfo.status !== "complete") return;
  chrome.tabs.sendMessage(tabId, { type: "CAPTURE_START" }).catch(() => {});
});

// Cross-instance dedup: if more than one content-script instance is alive in a
// tab (e.g. reinjection + manifest), the SAME DOM action arrives multiple times
// within a few ms. Collapse identical events that land inside a tiny window.
let ddKey = "";
let ddAt = 0;
const DEDUP_WINDOW_MS = 120;

// Receive events from content script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "CAPTURE_EVENT" && state.active && state.startedAt !== null) {
    const e = msg.event;
    const key = `${e.type}|${e.label ?? ""}|${e.url ?? ""}|${e.preview ?? ""}|${e.meta?.selector ?? ""}`;
    const now = Date.now();
    if (key === ddKey && now - ddAt < DEDUP_WINDOW_MS) return; // duplicate from another instance
    ddKey = key;
    ddAt = now;
    const event: CaptureEvent = {
      ...msg.event,
      t: now - state.startedAt,
      client: clientId, // tag with this profile so the bridge can merge + distinguish profiles
    };
    state.events.push(event);
    const m = event.meta ?? {};
    const metaBits = [
      m.role && `role=${m.role}`,
      m.icon && `icon=${m.icon}`,
      m.href && `href=${m.href}`,
      m.section && `section=${m.section}`,
      m.id && `id=${m.id}`,
      event.preview && `value="${event.preview}"`,
    ].filter(Boolean).join(" ");
    log(`[GG] #${state.events.length} ${event.type} | ${event.label ?? event.url ?? ""} | ${metaBits} | t=${event.t}ms`);
    broadcastState();
    // Stream live to GlitchRecord so it shows the event feed in real time
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "event:live", event }));
    }
  }
  return false;
});

// Bumped on every call so a slow async run can't clobber a newer one. Without
// this, a quick start→stop race could let the (slower) red-dot draw resolve LAST
// and leave the icon stuck red after recording stopped.
let iconGeneration = 0;

async function setRecordingIcon(recording: boolean) {
  const myGeneration = ++iconGeneration;
  const sizes = [16, 32, 48, 128];
  const imageData: Record<number, ImageData> = {};

  for (const size of sizes) {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d")!;

    // Draw original icon
    const res = await fetch(chrome.runtime.getURL(`icon${size}.png`));
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    ctx.drawImage(bitmap, 0, 0, size, size);
    bitmap.close();

    if (recording) {
      // Small red dot — bottom-right corner, 22% of icon size
      const r = Math.max(2, Math.round(size * 0.22));
      const x = size - r - 1;
      const y = size - r - 1;
      // Dark border so dot pops on any background
      ctx.beginPath();
      ctx.arc(x, y, r + 1, 0, Math.PI * 2);
      ctx.fillStyle = "#000";
      ctx.fill();
      // Red fill
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
    }

    imageData[size] = ctx.getImageData(0, 0, size, size);
  }

  // A newer setRecordingIcon call started while we were fetching/drawing — let it
  // win instead of stomping the icon with our now-stale state.
  if (myGeneration !== iconGeneration) return;
  try {
    await chrome.action.setIcon({ imageData });
  } catch { /* action API unavailable (e.g. during teardown) — ignore */ }
}

function armAllTabs() {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: "CAPTURE_START" }).catch(() => {});
      }
    }
  });
}

function startCapture(bridgeSessionId?: string, bridgeStartedAt?: number) {
  // Resync guard: the bridge re-sends recording:start every time this (ephemeral
  // MV3) service worker reconnects. If we're ALREADY capturing this same session,
  // a reconnect must NOT reset events/startedAt — that wipes everything captured
  // so far (root cause of "first half of the recording is missing"). Just re-arm
  // any tabs that may have lost their listeners and keep going.
  if (state.active && bridgeSessionId && state.sessionId === bridgeSessionId) {
    log(`[GG] recording:start resync — keeping ${state.events.length} events, re-arming tabs`);
    armAllTabs();
    return;
  }
  state.active = true;
  // Timeline origin: prefer the bridge's authoritative session start so ALL profiles
  // (and a restarted SW that died mid-recording) share ONE timeline. Without this,
  // each profile's t is on its own clock and a dead-then-restarted SW resets t to
  // the reconnect moment — post-restart events sort to the front, scrambling the
  // cross-profile order the AI narration relies on. Fall back to now() (manual mode).
  state.startedAt = bridgeStartedAt ?? Date.now();
  state.events = [];
  state.sessionId = bridgeSessionId ?? null; // use bridge session if provided
  state.fromBridge = !!bridgeSessionId;
  setRecordingIcon(true);
  broadcastState();
  log("[GG] Capture started", bridgeSessionId ? `(bridge session: ${bridgeSessionId})` : "(manual)");
  armAllTabs();
}

async function stopCapture() {
  state.active = false;
  setRecordingIcon(false);
  broadcastState();
  log(`[GG] Capture stopped — ${state.events.length} events`);

  // Notify tabs to stop
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: "CAPTURE_STOP" }).catch(() => {});
      }
    }
  });

  if (state.events.length === 0) return;

  // Bridge session → send events to GlitchRecord over WS.
  // The bridge generates the script + creates the GitHub issue in the selected repo.
  if (state.fromBridge && state.sessionId && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "events:upload",
      sessionId: state.sessionId,
      events: state.events,
      clientId,
    }));
    log(`[GG] Sent ${state.events.length} events to bridge → ${state.sessionId}`);
    return;
  }

  // Manual (hotkey) session → grab Recordly meta + POST to web API
  let meta: unknown = null;
  try {
    const sigRes = await fetch("http://localhost:3000/api/v1/capture-signal", { cache: "no-store" });
    const sigData = await sigRes.json() as { meta?: unknown };
    meta = sigData.meta ?? null;
    if (meta) console.log("[GG] Got recording meta from Recordly");
  } catch { /* server not running */ }

  // POST events + metadata to API
  try {
    const res = await fetch("http://localhost:3000/api/v1/capture-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: state.events, meta }),
    });
    const data = await res.json() as { success: boolean; data?: { sessionId: string } };
    if (data.success && data.data?.sessionId) {
      state.sessionId = data.data.sessionId;
      log("[GG] Uploaded — session:", data.data.sessionId);
      // Broadcast sessionId back to signal endpoint so Recordly can read it
      fetch("http://localhost:3000/api/v1/capture-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal: "idle", sessionId: state.sessionId }),
      }).catch(() => {});
      broadcastState();
    }
  } catch (err) {
    log("[GG] Upload failed:", String(err));
    await chrome.storage.local.set({ pendingEvents: state.events });
  }
}

function broadcastState() {
  chrome.runtime.sendMessage({
    type: "STATE_UPDATE",
    state: {
      active: state.active,
      eventCount: state.events.length,
      sessionId: state.sessionId,
    },
  }).catch(() => {});
}

// Expose state to popup
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  // Every message, with where it came from. Without this a content script that
  // never reaches the worker is indistinguishable from one whose handler failed
  // — and those need completely different fixes.
  log(`[GG] msg ${msg?.type ?? "?"} from ${sender?.tab?.url ?? sender?.url ?? "unknown"}`);

  if (msg.type === "GET_STATE") {
    reply({
      active: state.active,
      eventCount: state.events.length,
      sessionId: state.sessionId,
    });
    return true;
  }
  if (msg.type === "GET_EVENTS") {
    reply({ events: state.events });
    return true;
  }
  if (msg.type === "MANUAL_START") {
    startCapture();
    return false;
  }
  if (msg.type === "MANUAL_STOP") {
    stopCapture();
    return false;
  }
  if (msg.type === "SIGNAL_START" && !state.active) {
    startCapture();
    return false;
  }
  if (msg.type === "SIGNAL_STOP" && state.active) {
    stopCapture();
    return false;
  }
  if (msg.type === "GET_TESTER_STATUS") {
    reply({ loggedIn: !!tester, name: tester?.name, email: tester?.email, loginAt: tester?.loginAt });
    return true;
  }
  if (msg.type === "TESTER_LOGOUT") {
    testerLogout().then(() => reply({ ok: true }));
    return true;
  }
  // ── In-Meet pill (#311) ───────────────────────────────────
  if (msg.type === "MEET_RESOLVE_PROJECT") {
    resolveMeetProject(msg.meetUrl).then(reply);
    return true;
  }
  if (msg.type === "MEET_SEND_BOT") {
    sendBotToMeeting(msg.repoId, msg.meetUrl, msg.title).then(reply);
    return true;
  }
  if (msg.type === "MEET_MEETING_STATUS") {
    meetingStatus(msg.meetingId).then(reply);
    return true;
  }
  if (msg.type === "MEET_RETARGET") {
    retargetMeeting(msg.meetingId, msg.repoId).then(reply);
    return true;
  }
  if (msg.type === "OPEN_REPORT") {
    // The tab is the sender's own — never a tab id supplied by the page.
    const tab = sender.tab;
    if (!tab) {
      reply({ ok: false, error: "No tab" });
      return true;
    }
    prepareReport(tab, { consoleErrors: msg.consoleErrors, client: msg.client }).then(reply);
    return true;
  }
  if (msg.type === "SESSION_DEAD") {
    // The report UI got a 401/404 for our session id — believe it.
    void forgetDeadSession(String(msg.reason ?? "rejected by the server"));
    return false;
  }
  if (msg.type === "RECAPTURE_TAB") {
    chrome.tabs
      .captureVisibleTab(msg.windowId, { format: "png" })
      .then((dataUrl) => (dataUrl ? shrinkScreenshot(dataUrl) : null))
      .then((dataUrl) => reply({ dataUrl }))
      .catch(() => reply({ dataUrl: null }));
    return true;
  }
  if (msg.type === "MEET_REMEMBER_REPO") {
    void chrome.storage.local.set({ gg_meeting_repo: msg.repoId });
    return false;
  }

  if (msg.type === "TESTER_AUTO_LOGIN") {
    // Sender is the content script relaying a QA-page postMessage, not the
    // popup — no reply expected.
    void testerAutoLogin(msg.sessionId, msg.name, msg.email, resolveApiBase(msg.apiBase));
    return false;
  }

  return false;
});

/**
 * Which project this Meet belongs to, for the in-page pill.
 *
 * The server answers from the connected Google Calendar; the last-used repo is
 * local, so it is merged in here rather than round-tripped.
 */
/**
 * How long to wait for the live answer before falling back to the cached repo
 * list. The repo list barely changes; the calendar suggestion does, so the
 * network answer is still preferred — but not at the cost of the operator
 * staring at a spinner while a cold serverless function boots.
 */
const RESOLVE_FRESH_BUDGET_MS = 2500;
/** Cached repo lists older than this are treated as gone. */
const RESOLVE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CachedRepos {
  repos: { id: string; fullName: string }[];
  at: number;
}

/** Retries overlap, so every log line carries which attempt it belongs to. */
let resolveSeq = 0;

async function resolveMeetProject(meetUrl: string) {
  const id = ++resolveSeq;
  const started = Date.now();
  const trace = (message: string) => log(`[GG] resolve#${id} +${Date.now() - started}ms ${message}`);

  // Wait for the stored session — and mint one if there isn't a live one.
  await ensureSession();

  if (!tester) {
    trace("no tester session — extension is not logged in");
    return { ok: false, error: "Not logged in" };
  }
  trace(`session=${tester.sessionId.slice(0, 8)}… apiBase=${tester.apiBase}`);
  if (/localhost|127\.0\.0\.1/.test(tester.apiBase)) {
    // Worth shouting about: a session minted on the dev dashboard points every
    // call at a local Next.js server, whose first request compiles the route
    // (measured at ~15s) and which is unreachable from anywhere else. It looks
    // exactly like "the extension is slow".
    trace("WARNING: signed in against a LOCAL dev server, not glitchgrab.dev");
  }

  const session = tester;

  const live = (async () => {
    const res = await fetch(
      `${session.apiBase}/api/v1/meetings/resolve?meetUrl=${encodeURIComponent(meetUrl)}`,
      { headers: { ...authHeaders(), "x-gg-session": session.sessionId } }
    );
    if (!res.ok) throw new Error(`Server said ${res.status}`);

    const json = (await res.json()) as {
      data?: { repos: { id: string; fullName: string }[]; suggested: unknown; active?: unknown };
    };
    const repos = json.data?.repos ?? [];
    trace(`server returned ${repos.length} projects`);
    // Cache on every success so a slow or offline start still has something to
    // show instead of an indefinite spinner.
    void chrome.storage.local.set({
      gg_meeting_repos: { repos, at: Date.now() } satisfies CachedRepos,
    });
    return {
      repos,
      suggested: json.data?.suggested ?? null,
      // A bot already on this call, so a reloaded tab doesn't ask again.
      active: json.data?.active ?? null,
    };
  })();
  // The fallback below may answer first; without this the unhandled rejection
  // would surface as a service-worker error.
  live.catch(() => {});

  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), RESOLVE_FRESH_BUDGET_MS)
  );

  try {
    const fresh = await Promise.race([live, timeout]);
    const { gg_meeting_repo } = await chrome.storage.local.get("gg_meeting_repo");
    const lastRepoId = (gg_meeting_repo as string | undefined) ?? null;

    if (fresh) {
      return {
        ok: true,
        repos: fresh.repos,
        suggested: fresh.suggested,
        active: fresh.active,
        lastRepoId,
      };
    }

    // Server too slow — serve what we know. The in-flight request keeps going
    // and refreshes the cache for next time.
    const cached = await readCachedRepos();
    if (cached) {
      trace(`server slower than ${RESOLVE_FRESH_BUDGET_MS}ms — serving ${cached.repos.length} cached projects`);
      return { ok: true, repos: cached.repos, suggested: null, lastRepoId, stale: true };
    }

    // Nothing cached: wait it out rather than report a failure we don't have.
    const eventual = await live;
    return {
      ok: true,
      repos: eventual.repos,
      suggested: eventual.suggested,
      active: eventual.active,
      lastRepoId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    trace(`failed: ${message}`);

    const cached = await readCachedRepos();
    if (cached) {
      const { gg_meeting_repo } = await chrome.storage.local.get("gg_meeting_repo");
      trace(`falling back to ${cached.repos.length} cached projects`);
      return {
        ok: true,
        repos: cached.repos,
        suggested: null,
        lastRepoId: (gg_meeting_repo as string | undefined) ?? null,
        stale: true,
      };
    }
    return { ok: false, error: message.startsWith("Server said") ? message : "Could not reach Glitchgrab" };
  }
}

async function readCachedRepos(): Promise<CachedRepos | null> {
  try {
    const { gg_meeting_repos } = await chrome.storage.local.get("gg_meeting_repos");
    const cached = gg_meeting_repos as CachedRepos | undefined;
    if (!cached?.repos?.length) return null;
    if (Date.now() - cached.at > RESOLVE_CACHE_TTL_MS) return null;
    return cached;
  } catch {
    return null;
  }
}

/** Dispatch the recording bot to this call. */
async function sendBotToMeeting(repoId: string, meetUrl: string, title: string | null) {
  await ensureSession();
  if (!tester) return { ok: false, error: "Not logged in" };

  try {
    const res = await fetch(`${tester.apiBase}/api/v1/meetings/bot`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
        "x-gg-session": tester.sessionId,
      },
      body: JSON.stringify({ repoId, meetUrl, title }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      data?: { meetingId?: string };
    };
    if (!res.ok) {
      return {
        ok: false,
        error: json.error ?? `Server said ${res.status}`,
        // A 409 carries the recording that is ALREADY running here, so the
        // button can adopt it instead of showing a failure for a call that is
        // in fact being recorded.
        meetingId: json.data?.meetingId ?? null,
      };
    }

    void chrome.storage.local.set({ gg_meeting_repo: repoId });
    // The meeting id is what lets the button follow the bot's real progress
    // instead of assuming the dispatch worked.
    return { ok: true, meetingId: json.data?.meetingId ?? null };
  } catch {
    return { ok: false, error: "Could not reach Glitchgrab" };
  }
}

/** Live phase of a bot recording, for the in-Meet button. */
async function meetingStatus(meetingId: string) {
  await ensureSession();
  if (!tester) return { ok: false, error: "Not logged in" };

  try {
    const res = await fetch(`${tester.apiBase}/api/v1/meetings/${meetingId}/bot-status`, {
      headers: { ...authHeaders(), "x-gg-session": tester.sessionId },
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      data?: { botStatus?: string | null; botError?: string | null; repoId?: string };
    };
    if (!res.ok) return { ok: false, error: json.error ?? `Server said ${res.status}` };

    return {
      ok: true,
      botStatus: json.data?.botStatus ?? null,
      botError: json.data?.botError ?? null,
      repoId: json.data?.repoId ?? null,
    };
  } catch {
    return { ok: false, error: "Could not reach Glitchgrab" };
  }
}

/**
 * Move an in-progress recording to a different project.
 *
 * Nothing is said to the bot — it keeps recording. Only the filing changes.
 */
async function retargetMeeting(meetingId: string, repoId: string) {
  await ensureSession();
  if (!tester) return { ok: false, error: "Not logged in" };

  try {
    const res = await fetch(`${tester.apiBase}/api/v1/meetings/${meetingId}/repo`, {
      method: "PATCH",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
        "x-gg-session": tester.sessionId,
      },
      body: JSON.stringify({ repoId }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { ok: false, error: json.error ?? `Server said ${res.status}` };

    void chrome.storage.local.set({ gg_meeting_repo: repoId });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach Glitchgrab" };
  }
}
