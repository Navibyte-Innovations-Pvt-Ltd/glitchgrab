console.log("[GG] Content script loaded on", location.hostname);
let capturing = false;
let stopped = false; // set on first context invalidation — all queued callbacks bail immediately
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
  stopped = true;          // flip FIRST — all queued callbacks now bail via isContextAlive()
  clearInterval(pollTimer);
  stopListening();
}

// ── Signal polling ────────────────────────────────────────────
const pollTimer = setInterval(() => {
  if (stopped) return;               // fast-exit for all queued callbacks after first failure
  if (!isContextAlive()) { cleanup(); return; }
  try {
    const p = chrome.runtime.sendMessage({ type: "POLL_SIGNAL" });
    p?.catch?.((err: Error) => {
      if (err?.message?.includes("Extension context invalidated")) cleanup();
    });
  } catch { cleanup(); }
}, 600);

window.addEventListener("unhandledrejection", (event) => {
  if ((event.reason as Error)?.message?.includes("Extension context invalidated")) {
    event.preventDefault();
    cleanup();
  }
});

// Last-resort: catch any synchronous "Extension context invalidated" that escapes try/catch
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
  });
} catch { /* context invalidated at load */ }

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
      if (preview) sendEvent({ type: "input", label, tag: lastInputEl.tagName.toLowerCase(), url: location.href, preview });
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
  sendEvent({ type: "click", label, tag, url: location.href });
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
      sendEvent({ type: "input", label, tag: lastInputEl.tagName.toLowerCase(), url: location.href, preview: preview || undefined });
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

// ── Helpers ────────────────────────────────────────────────────
function firstLine(text: string): string {
  return text.split(/[\n\r]/).map(s => s.trim()).find(s => s.length > 0) ?? "";
}

function getClickLabel(target: Element): { label: string; tag: string } {
  const interactive = target.closest(
    'button, a, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="option"], input, select, label'
  );
  const candidates = interactive ? [interactive, target] : [target];
  for (const el of candidates) {
    const explicit =
      el.getAttribute("aria-label")?.trim() ||
      el.getAttribute("title")?.trim() ||
      el.getAttribute("data-testid")?.replace(/-/g, " ").trim() ||
      el.getAttribute("alt")?.trim() ||
      el.getAttribute("placeholder")?.trim();
    if (explicit) return { label: explicit.slice(0, 80), tag: el.tagName.toLowerCase() };
    const raw = (el as HTMLElement).innerText?.trim() ?? "";
    const line = firstLine(raw);
    if (line && line.length >= 2 && line.length <= 60) {
      return { label: line, tag: el.tagName.toLowerCase() };
    }
  }
  let el: Element | null = (interactive ?? target).parentElement;
  for (let i = 0; i < 3; i++) {
    if (!el) break;
    const label = el.getAttribute("aria-label")?.trim() || el.getAttribute("title")?.trim();
    if (label) return { label: label.slice(0, 80), tag: el.tagName.toLowerCase() };
    el = el.parentElement;
  }
  return { label: "icon-button", tag: (interactive ?? target).tagName.toLowerCase() };
}

function sendEvent(event: {
  type: string;
  label?: string;
  tag?: string;
  url?: string;
  durationMs?: number;
  preview?: string;
}) {
  if (!isContextAlive()) return;
  try {
    const p = chrome.runtime.sendMessage({ type: "CAPTURE_EVENT", event });
    p?.catch?.(() => {});
  } catch { /* context invalidated */ }
}

// ── Navigation via history API ─────────────────────────────────
const origPushState = history.pushState.bind(history);
const origReplaceState = history.replaceState.bind(history);
history.pushState = (...args) => { origPushState(...args); onNavigate(); };
history.replaceState = (...args) => { origReplaceState(...args); onNavigate(); };
window.addEventListener("popstate", onNavigate);

function onNavigate() {
  if (!capturing) return;
  lastEventAt = Date.now();
  if (inIdle) { sendEvent({ type: "idle", durationMs: Date.now() - idleStart }); inIdle = false; }
  sendEvent({ type: "navigate", url: location.href, label: document.title });
}
