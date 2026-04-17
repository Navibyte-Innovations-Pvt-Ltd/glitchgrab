const TOAST_ID = "glitchgrab-misconfig-toast";
const STYLE_ID = "glitchgrab-misconfig-style";
const ANIMATION_MS = 180;
const AUTO_DISMISS_MS = 6000;

const seenWarnings = new Set<string>();

function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes glitchgrab-toast-in {
      from { transform: translateY(16px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes glitchgrab-toast-out {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(16px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

function renderToast(message: string) {
  if (typeof document === "undefined") return;
  injectStyles();

  const existing = document.getElementById(TOAST_ID);
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = TOAST_ID;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.style.cssText = [
    "position:fixed",
    "bottom:20px",
    "right:20px",
    "z-index:2147483647",
    "max-width:360px",
    "padding:12px 14px",
    "border-radius:10px",
    "background:#18181b",
    "color:#fafafa",
    "font-size:13px",
    "line-height:1.4",
    'font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    "box-shadow:0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.12)",
    "display:flex",
    "align-items:flex-start",
    "gap:10px",
    `animation: glitchgrab-toast-in ${ANIMATION_MS}ms ease-out`,
  ].join(";");

  const icon = document.createElement("span");
  icon.textContent = "!";
  icon.style.cssText = [
    "flex-shrink:0",
    "width:20px",
    "height:20px",
    "border-radius:50%",
    "background:#f59e0b",
    "color:#18181b",
    "font-weight:700",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "font-size:13px",
  ].join(";");

  const body = document.createElement("div");
  body.style.cssText = "flex:1;min-width:0";

  const title = document.createElement("div");
  title.textContent = "Glitchgrab not configured";
  title.style.cssText = "font-weight:600;margin-bottom:2px";

  const detail = document.createElement("div");
  detail.textContent = message;
  detail.style.cssText = "color:#d4d4d8;font-size:12px";

  body.appendChild(title);
  body.appendChild(detail);

  const close = document.createElement("button");
  close.type = "button";
  close.setAttribute("aria-label", "Dismiss");
  close.textContent = "×";
  close.style.cssText = [
    "flex-shrink:0",
    "background:transparent",
    "border:none",
    "color:#a1a1aa",
    "font-size:18px",
    "line-height:1",
    "cursor:pointer",
    "padding:0 2px",
  ].join(";");

  let dismissTimer: ReturnType<typeof setTimeout> | null = null;
  const dismiss = () => {
    if (dismissTimer) clearTimeout(dismissTimer);
    toast.style.animation = `glitchgrab-toast-out ${ANIMATION_MS}ms ease-in forwards`;
    setTimeout(() => toast.remove(), ANIMATION_MS);
  };

  close.addEventListener("click", dismiss);
  dismissTimer = setTimeout(dismiss, AUTO_DISMISS_MS);

  toast.appendChild(icon);
  toast.appendChild(body);
  toast.appendChild(close);

  document.body.appendChild(toast);
}

/**
 * Warn once per unique key. Shows a visible toast in the browser
 * and logs to console. Safe to call repeatedly — will dedupe.
 */
export function warnMisconfigured(key: string, message: string) {
  try {
    if (!seenWarnings.has(key)) {
      seenWarnings.add(key);
      // eslint-disable-next-line no-console
      console.warn(`[glitchgrab] ${message}`);
    }
    renderToast(message);
  } catch {
    // never crash the host app
  }
}

/** Reset internal state — used by tests. */
export function __resetWarnToast() {
  seenWarnings.clear();
  if (typeof document !== "undefined") {
    document.getElementById(TOAST_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
  }
}
