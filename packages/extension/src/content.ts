import { Capture, type CaptureEvent } from "./capture";

let stopped = false; // set on context invalidation — all callbacks bail immediately

function isContextAlive(): boolean {
  if (stopped) return false;
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

// Send a captured event to the background service worker. Guarded so a dead
// extension context never throws.
function sendEvent(event: CaptureEvent) {
  if (!isContextAlive()) return;
  try {
    const p = chrome.runtime.sendMessage({ type: "CAPTURE_EVENT", event });
    p?.catch?.(() => {});
  } catch { /* context invalidated */ }
}

const capture = new Capture(sendEvent);

function cleanup() {
  if (stopped) return;
  stopped = true;
  capture.stop();
}

// ── Single-instance guard ─────────────────────────────────────
// The extension reinjects this script into already-open tabs on startup.
// If a LIVE instance already runs here, bail so we don't double-register
// listeners. Orphaned (dead-context) instances do NOT answer the ping —
// their chrome.runtime is gone — so a fresh inject correctly replaces them.
const GG_PING = "__gg_ping__";

(function bootstrap() {
  const probe = { alive: false };
  document.dispatchEvent(new CustomEvent(GG_PING, { detail: probe }));
  if (probe.alive) {
    // A live sibling already owns this page — become inert (register nothing).
    return;
  }

  // Only the ACTIVE instance answers pings. Registered after the probe check so
  // inert instances never falsely claim the page and block a later reinjection.
  document.addEventListener(GG_PING, (e) => {
    if (isContextAlive()) (e as CustomEvent<{ alive: boolean }>).detail.alive = true;
  });

  console.log("[GG] Content script active on", location.hostname);

  window.addEventListener("unhandledrejection", (event) => {
    if ((event.reason as Error)?.message?.includes("Extension context invalidated")) {
      event.preventDefault();
      cleanup();
    }
  });

  window.addEventListener("error", (event) => {
    if (event.message?.includes("Extension context invalidated")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      cleanup();
    }
  }, { capture: true });

  try {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === "CAPTURE_START") capture.start();
      else if (msg.type === "CAPTURE_STOP") capture.stop();
      else if (msg.type === "GG_LOG") console.log("[GG-bg]", msg.text);
    });
  } catch { /* context invalidated at load */ }

  // Silent tester auto-login handshake (#297) — the /qa/<token> QA-verifier
  // page posts this to its OWN window after minting a tokenless
  // ExtensionSession server-side. This content script runs on <all_urls>, so
  // WITHOUT an origin check any site could postMessage into itself and spoof
  // a fake tester identity (session fixation / attribution poisoning) —
  // gate both the listener's existence and each message on the real origin.
  const GG_AUTH_ORIGINS = ["https://glitchgrab.dev", "http://localhost:3000"];
  if (GG_AUTH_ORIGINS.includes(window.location.origin)) {
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      if (!GG_AUTH_ORIGINS.includes(event.origin)) return;
      const data = event.data as { source?: string; type?: string; sessionId?: string; name?: string; email?: string };
      if (data?.source !== "glitchgrab-qa" || data.type !== "GG_AUTO_LOGIN") return;
      if (!data.sessionId || !data.name) return;
      if (!isContextAlive()) return;
      try {
        chrome.runtime.sendMessage({
          type: "TESTER_AUTO_LOGIN",
          sessionId: data.sessionId,
          name: data.name,
          email: data.email,
        });
      } catch { /* context invalidated */ }
    });
  }

  // CRITICAL: a page that LOADS during an active recording (new tab, or a
  // full-page navigation that tore down the previous content script) misses the
  // one-time CAPTURE_START broadcast. Ask the background if capture is active
  // and self-start so no events are lost.
  try {
    chrome.runtime.sendMessage({ type: "GET_STATE" }, (s) => {
      if (chrome.runtime.lastError) return; // background asleep / context gone
      if (s?.active) capture.start();
    });
  } catch { /* context invalidated at load */ }

  // Keep the background worker awake (or wake it) via a persistent port. Opening
  // the port wakes a sleeping MV3 worker immediately, so it connects to the
  // GlitchRecord bridge as soon as a page is open — instead of sleeping until a
  // stray event, which left the recording's first seconds uncaptured. On
  // disconnect (worker died / ext reloaded) we reconnect, which wakes it again.
  const keepBgAlive = () => {
    if (!isContextAlive()) return;
    try {
      const port = chrome.runtime.connect({ name: "gg-heartbeat" });
      port.onDisconnect.addListener(() => {
        void chrome.runtime.lastError; // swallow "receiving end" noise
        setTimeout(keepBgAlive, 1000);
      });
    } catch { /* context invalidated */ }
  };
  keepBgAlive();

  // History-API navigation hooks → SPA navigations
  const onNavigate = () => capture.onNavigate(document.title);
  const origPushState = history.pushState.bind(history);
  const origReplaceState = history.replaceState.bind(history);
  history.pushState = (...args) => { origPushState(...args); onNavigate(); };
  history.replaceState = (...args) => { origReplaceState(...args); onNavigate(); };
  window.addEventListener("popstate", onNavigate);
})();
