// Content script — injected into every page
// Captures click + navigation events when capture session is active

let capturing = false;
let lastEventAt = 0;
let idleTimer: ReturnType<typeof setInterval> | null = null;
let idleStart = 0;
let inIdle = false;

// Listen for capture start/stop from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "CAPTURE_START") {
    startListening();
  } else if (msg.type === "CAPTURE_STOP") {
    stopListening();
  }
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
    sendEvent({
      type: "idle",
      label: undefined,
      tag: undefined,
      durationMs: Date.now() - idleStart,
    });
    inIdle = false;
  }
}

function onClickCapture(e: MouseEvent) {
  if (!capturing) return;
  lastEventAt = Date.now();
  if (inIdle) {
    sendEvent({
      type: "idle",
      durationMs: Date.now() - idleStart,
    });
    inIdle = false;
  }

  const target = e.target as Element;
  const { label, tag } = getClickLabel(target);
  const currentUrl = location.href;

  sendEvent({ type: "click", label, tag, url: currentUrl });
}

function getClickLabel(target: Element): { label: string; tag: string } {
  // Walk up to 5 levels looking for meaningful label
  let el: Element | null = target;
  for (let i = 0; i < 5; i++) {
    if (!el) break;
    const label =
      el.getAttribute("aria-label")?.trim() ||
      el.getAttribute("title")?.trim() ||
      el.getAttribute("data-testid")?.replace(/-/g, " ").trim() ||
      el.getAttribute("alt")?.trim() ||
      (el as HTMLElement).innerText?.trim().slice(0, 80);

    if (label && label.length > 0 && label.length < 100) {
      return { label, tag: el.tagName.toLowerCase() };
    }
    el = el.parentElement;
  }

  // SVG / icon fallback — find nearest interactive ancestor
  const interactive = target.closest(
    'button, a, [role="button"], [role="link"], [role="menuitem"], [role="tab"], input, select'
  );
  if (interactive) {
    const label =
      interactive.getAttribute("aria-label")?.trim() ||
      interactive.getAttribute("title")?.trim() ||
      (interactive as HTMLElement).innerText?.trim().slice(0, 80) ||
      interactive.getAttribute("type") ||
      "icon-button";
    return { label, tag: interactive.tagName.toLowerCase() };
  }

  return { label: "unknown", tag: target.tagName.toLowerCase() };
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

// Navigation detection via history API patching
const origPushState = history.pushState.bind(history);
const origReplaceState = history.replaceState.bind(history);

history.pushState = (...args) => {
  origPushState(...args);
  onNavigate("pushState");
};
history.replaceState = (...args) => {
  origReplaceState(...args);
  onNavigate("replaceState");
};
window.addEventListener("popstate", () => onNavigate("popstate"));

function onNavigate(_reason: string) {
  if (!capturing) return;
  lastEventAt = Date.now();
  if (inIdle) {
    sendEvent({ type: "idle", durationMs: Date.now() - idleStart });
    inIdle = false;
  }
  sendEvent({ type: "navigate", url: location.href, label: document.title });
}
