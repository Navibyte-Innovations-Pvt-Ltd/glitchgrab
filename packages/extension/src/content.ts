console.log("[GG] Content script loaded on", location.hostname);
let capturing = false;
let lastEventAt = 0;
let idleTimer: ReturnType<typeof setInterval> | null = null;
let idleStart = 0;
let inIdle = false;

let lastClickKey = "";
let lastClickAt = 0;
const DEDUP_MS = 80;

// ── Signal polling ────────────────────────────────────────────
// Content script pings background every 600ms to check signal.
// Background does the actual fetch (immune to mixed-content HTTPS blocks).
setInterval(() => {
  chrome.runtime.sendMessage({ type: "POLL_SIGNAL" }).catch(() => {});
}, 600);

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "CAPTURE_START") startListening();
  else if (msg.type === "CAPTURE_STOP") stopListening();
});

function startListening() {
  if (capturing) return;
  capturing = true;
  lastEventAt = Date.now();
  document.addEventListener("click", onClickCapture, { capture: true, passive: true });
  idleTimer = setInterval(checkIdle, 1000);
}

function stopListening() {
  if (!capturing) return;
  capturing = false;
  document.removeEventListener("click", onClickCapture, { capture: true });
  if (idleTimer) clearInterval(idleTimer);
  idleTimer = null;
}

function checkIdle() {
  const idleMs = Date.now() - lastEventAt;
  if (!inIdle && idleMs > 3000) {
    inIdle = true;
    idleStart = lastEventAt;
  } else if (inIdle && idleMs < 3000) {
    sendEvent({ type: "idle", durationMs: Date.now() - idleStart });
    inIdle = false;
  }
}

function onClickCapture(e: MouseEvent) {
  if (!capturing) return;

  const now = Date.now();
  lastEventAt = now;

  if (inIdle) {
    sendEvent({ type: "idle", durationMs: now - idleStart });
    inIdle = false;
  }

  const target = e.target as Element;
  const { label, tag } = getClickLabel(target);

  // Drop duplicate bubbles: same label within DEDUP_MS
  const clickKey = `${label}::${tag}`;
  if (clickKey === lastClickKey && now - lastClickAt < DEDUP_MS) return;
  lastClickKey = clickKey;
  lastClickAt = now;

  sendEvent({ type: "click", label, tag, url: location.href });
}

function firstLine(text: string): string {
  return text.split(/[\n\r]/).map(s => s.trim()).find(s => s.length > 0) ?? "";
}

function getClickLabel(target: Element): { label: string; tag: string } {
  // Prefer explicit interactive ancestor first (button, link, role)
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

    // innerText — first line only, skip if it's just price/number noise
    const raw = (el as HTMLElement).innerText?.trim() ?? "";
    const line = firstLine(raw);
    if (line && line.length >= 2 && line.length <= 60) {
      return { label: line, tag: el.tagName.toLowerCase() };
    }
  }

  // Walk up 3 more levels for aria-label
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
}) {
  chrome.runtime.sendMessage({ type: "CAPTURE_EVENT", event }).catch(() => {});
}

// Navigation via history API
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
