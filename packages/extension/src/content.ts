import { type ElementMeta, getClickLabel, describeElement } from "./labeler";

let capturing = false;
let stopped = false; // set on context invalidation — all callbacks bail immediately
let lastEventAt = 0;
let idleTimer: ReturnType<typeof setInterval> | null = null;
let idleStart = 0;
let inIdle = false;

let lastClickKey = "";
let lastClickAt = 0;
const DEDUP_MS = 80;

// Debounce timers for noisy events
let inputTimer: ReturnType<typeof setTimeout> | null = null;
let lastInputEl: HTMLInputElement | HTMLTextAreaElement | null = null;
let selTimer: ReturnType<typeof setTimeout> | null = null;
let scrollTimer: ReturnType<typeof setTimeout> | null = null;

function isContextAlive(): boolean {
  if (stopped) return false;
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

function cleanup() {
  if (stopped) return;
  stopped = true;
  stopListening();
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
      if (msg.type === "CAPTURE_START") startListening();
      else if (msg.type === "CAPTURE_STOP") stopListening();
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
      if (s?.active) startListening();
    });
  } catch { /* context invalidated at load */ }

  // History-API navigation hooks
  const origPushState = history.pushState.bind(history);
  const origReplaceState = history.replaceState.bind(history);
  history.pushState = (...args) => { origPushState(...args); onNavigate(); };
  history.replaceState = (...args) => { origReplaceState(...args); onNavigate(); };
  window.addEventListener("popstate", onNavigate);
})();

function startListening() {
  if (capturing) return;
  capturing = true;
  lastEventAt = Date.now();
  document.addEventListener("click",           onClickCapture,     { capture: true, passive: true });
  document.addEventListener("input",           onInputCapture,     { capture: true, passive: true });
  document.addEventListener("keydown",         onKeydownCapture,   { capture: true, passive: true });
  document.addEventListener("selectionchange", onSelectionChange,  { passive: true });
  document.addEventListener("scroll",          onScrollCapture,    { capture: true, passive: true });
  document.addEventListener("copy",            onCopyCapture,      { capture: true });
  document.addEventListener("paste",           onPasteCapture,     { capture: true });
  idleTimer = setInterval(checkIdle, 1000);
}

function stopListening() {
  if (!capturing) return;
  capturing = false;
  document.removeEventListener("click",           onClickCapture,    { capture: true });
  document.removeEventListener("input",           onInputCapture,    { capture: true });
  document.removeEventListener("keydown",         onKeydownCapture,  { capture: true });
  document.removeEventListener("selectionchange", onSelectionChange);
  document.removeEventListener("scroll",          onScrollCapture,   { capture: true });
  document.removeEventListener("copy",            onCopyCapture,     { capture: true });
  document.removeEventListener("paste",           onPasteCapture,    { capture: true });
  if (idleTimer) { clearInterval(idleTimer); idleTimer = null; }
  // Flush pending input event
  if (inputTimer) {
    clearTimeout(inputTimer);
    inputTimer = null;
    if (lastInputEl) {
      const { label } = getClickLabel(lastInputEl);
      const preview = lastInputEl.value.slice(0, 40).replace(/\s+/g, " ").trim();
      if (preview) sendEvent({ type: "input", label, tag: lastInputEl.tagName.toLowerCase(), url: location.href, preview, meta: describeElement(lastInputEl) });
      lastInputEl = null;
    }
  }
  if (selTimer) { clearTimeout(selTimer); selTimer = null; }
  if (scrollTimer) { clearTimeout(scrollTimer); scrollTimer = null; }
}

function checkIdle() {
  try {
    const idleMs = Date.now() - lastEventAt;
    if (!inIdle && idleMs > 3000) {
      inIdle = true;
      idleStart = lastEventAt;
    } else if (inIdle && idleMs < 3000) {
      sendEvent({ type: "idle", durationMs: Date.now() - idleStart });
      inIdle = false;
    }
  } catch { /* context gone */ }
}

// ── Click ─────────────────────────────────────────────────────
function onClickCapture(e: MouseEvent) {
  if (!capturing) return;
  const now = Date.now();
  lastEventAt = now;
  if (inIdle) { sendEvent({ type: "idle", durationMs: now - idleStart }); inIdle = false; }
  const target = e.target as Element;
  const { label, tag } = getClickLabel(target);
  const clickKey = `${label}::${tag}`;
  if (clickKey === lastClickKey && now - lastClickAt < DEDUP_MS) return;
  lastClickKey = clickKey;
  lastClickAt = now;
  sendEvent({ type: "click", label, tag, url: location.href, meta: describeElement(target) });
}

// ── Input / typing ─────────────────────────────────────────────
function onInputCapture(e: Event) {
  if (!capturing) return;
  lastEventAt = Date.now();
  if (inIdle) { sendEvent({ type: "idle", durationMs: Date.now() - idleStart }); inIdle = false; }
  const target = e.target as HTMLInputElement | HTMLTextAreaElement;
  if ((target as HTMLInputElement).type === "password") return;
  lastInputEl = target;
  if (inputTimer) clearTimeout(inputTimer);
  inputTimer = setTimeout(() => {
    try {
      inputTimer = null;
      if (!lastInputEl) return;
      const { label } = getClickLabel(lastInputEl);
      const preview = lastInputEl.value.slice(0, 40).replace(/\s+/g, " ").trim();
      sendEvent({ type: "input", label, tag: lastInputEl.tagName.toLowerCase(), url: location.href, preview: preview || undefined, meta: describeElement(lastInputEl) });
      lastInputEl = null;
    } catch { /* dom detached or context gone */ }
  }, 800);
}

// ── Keydown (Enter / Escape / Tab) ─────────────────────────────
function onKeydownCapture(e: KeyboardEvent) {
  if (!capturing) return;
  if (!["Enter", "Escape", "Tab"].includes(e.key)) return;
  lastEventAt = Date.now();
  if (inIdle) { sendEvent({ type: "idle", durationMs: Date.now() - idleStart }); inIdle = false; }
  sendEvent({ type: "keydown", label: e.key, url: location.href });
}

// ── Text selection ─────────────────────────────────────────────
function onSelectionChange() {
  if (!capturing) return;
  if (selTimer) clearTimeout(selTimer);
  selTimer = setTimeout(() => {
    try {
      selTimer = null;
      const sel = window.getSelection()?.toString().trim() ?? "";
      if (sel.length >= 3) {
        sendEvent({ type: "select", label: sel.slice(0, 80), url: location.href });
      }
    } catch { /* context gone */ }
  }, 500);
}

// ── Scroll ─────────────────────────────────────────────────────
function onScrollCapture() {
  if (!capturing) return;
  lastEventAt = Date.now();
  if (scrollTimer) clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    try {
      scrollTimer = null;
      sendEvent({ type: "scroll", url: location.href });
    } catch { /* context gone */ }
  }, 1500);
}

// ── Copy / Paste ───────────────────────────────────────────────
function onCopyCapture() {
  if (!capturing) return;
  const sel = window.getSelection()?.toString().trim().slice(0, 60) ?? "";
  sendEvent({ type: "copy", label: sel || undefined, url: location.href });
}

function onPasteCapture() {
  if (!capturing) return;
  sendEvent({ type: "paste", url: location.href });
}


function sendEvent(event: {
  type: string;
  label?: string;
  tag?: string;
  url?: string;
  durationMs?: number;
  preview?: string;
  meta?: ElementMeta;
}) {
  if (!isContextAlive()) return;
  try {
    const p = chrome.runtime.sendMessage({ type: "CAPTURE_EVENT", event });
    p?.catch?.(() => {});
  } catch { /* context invalidated */ }
}

function onNavigate() {
  if (!capturing) return;
  lastEventAt = Date.now();
  if (inIdle) { sendEvent({ type: "idle", durationMs: Date.now() - idleStart }); inIdle = false; }
  sendEvent({ type: "navigate", url: location.href, label: document.title });
}
