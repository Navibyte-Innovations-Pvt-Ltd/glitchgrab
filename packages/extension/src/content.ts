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

  // History-API navigation hooks → SPA navigations
  const onNavigate = () => capture.onNavigate(document.title);
  const origPushState = history.pushState.bind(history);
  const origReplaceState = history.replaceState.bind(history);
  history.pushState = (...args) => { origPushState(...args); onNavigate(); };
  history.replaceState = (...args) => { origReplaceState(...args); onNavigate(); };
  window.addEventListener("popstate", onNavigate);
})();
