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

// ── Helpers ────────────────────────────────────────────────────
function firstLine(text: string): string {
  return text.split(/[\n\r]/).map(s => s.trim()).find(s => s.length > 0) ?? "";
}

export interface ElementMeta {
  tag?: string;            // a, button, div…
  role?: string;           // explicit or implicit ARIA role
  inputType?: string;      // text, checkbox, search… (inputs only)
  text?: string;           // visible text (longer than label)
  ariaLabel?: string;
  title?: string;
  name?: string;
  id?: string;
  classes?: string;        // first few meaningful class tokens
  href?: string;           // resolved link path (anchors)
  icon?: string;           // detected icon: svg <title>/<use>/class, or img alt/src
  section?: string;        // nearest landmark / heading providing context
  selector?: string;       // short CSS-ish path to the element
  placeholder?: string;
  checked?: string;        // "true"/"false" for checkbox/radio/switch
}

function attr(el: Element, name: string): string {
  return (el.getAttribute(name) ?? "").replace(/\s+/g, " ").trim();
}

// Implicit role for common tags when no explicit role is set.
function implicitRole(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if (tag === "a" && el.hasAttribute("href")) return "link";
  if (tag === "button" || tag === "summary") return "button";
  if (tag === "select") return "combobox";
  if (tag === "textarea") return "textbox";
  if (tag === "input") {
    const t = (el as HTMLInputElement).type;
    if (["checkbox", "radio"].includes(t)) return t;
    if (t === "submit" || t === "button") return "button";
    return "textbox";
  }
  return "";
}

// Detect what icon an element shows (icon-only buttons are common & opaque).
function detectIcon(el: Element): string {
  const svg = el.querySelector("svg");
  if (svg) {
    const title = svg.querySelector("title")?.textContent?.trim();
    if (title) return `svg:${title}`;
    const use = svg.querySelector("use");
    const href = use?.getAttribute("href") || use?.getAttribute("xlink:href");
    if (href) return `svg:${href.split(/[#/]/).pop()}`;
    const dataIcon = svg.getAttribute("data-icon");
    if (dataIcon) return `svg:${dataIcon}`;
    const cls = (svg.getAttribute("class") || "").split(/\s+/).find(c => /icon|ic-|fa-/.test(c));
    if (cls) return `svg:${cls}`;
    return "svg";
  }
  const img = el.querySelector("img");
  if (img) {
    const alt = img.getAttribute("alt")?.trim();
    if (alt) return `img:${alt}`;
    const src = img.getAttribute("src") || "";
    const base = src.split("/").pop()?.split("?")[0];
    if (base) return `img:${base}`;
  }
  const iconClass = (el.getAttribute("class") || "").split(/\s+/).find(c => /^(icon|fa|material-icons|ic-)/.test(c));
  if (iconClass) return `class:${iconClass}`;
  return "";
}

// Nearest meaningful container/heading to give the click context.
function nearestSection(el: Element): string {
  let node: Element | null = el;
  for (let i = 0; i < 8 && node; i++) {
    const landmark = node.closest("[role=navigation],[role=main],[role=banner],[role=dialog],[role=menu],nav,header,footer,aside,section,form,dialog,[aria-label]");
    if (landmark && landmark !== el) {
      const lbl = attr(landmark, "aria-label") || landmark.getAttribute("role") || landmark.tagName.toLowerCase();
      if (lbl) return lbl.slice(0, 40);
    }
    node = node.parentElement;
  }
  // fall back to nearest heading above
  const heading = el.closest("section,article,main,div")?.querySelector("h1,h2,h3");
  const ht = (heading as HTMLElement | null)?.innerText?.trim();
  return ht ? ht.slice(0, 40) : "";
}

// Compact CSS-ish path: tag#id.firstClass, 3 levels deep.
function shortSelector(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  for (let i = 0; i < 3 && node && node.tagName; i++) {
    let part = node.tagName.toLowerCase();
    const id = node.getAttribute("id");
    if (id) { part += `#${id}`; parts.unshift(part); break; }
    const cls = (node.getAttribute("class") || "").split(/\s+/).find(c => c && !/^(css-|sc-)/.test(c) && c.length < 24);
    if (cls) part += `.${cls}`;
    parts.unshift(part);
    node = node.parentElement;
  }
  return parts.join(" > ").slice(0, 120);
}

function describeElement(target: Element): ElementMeta {
  const interactive = target.closest(
    'button, a, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="option"], [role="checkbox"], [role="switch"], input, select, textarea, label, summary'
  );
  const el = (interactive ?? target) as HTMLElement;
  const meta: ElementMeta = {};
  meta.tag = el.tagName.toLowerCase();
  const role = attr(el, "role") || implicitRole(el);
  if (role) meta.role = role;
  if (el.tagName === "INPUT") meta.inputType = (el as HTMLInputElement).type;
  const text = firstLine((el.innerText || "").replace(/\s+/g, " ").trim());
  if (text) meta.text = text.slice(0, 100);
  const aria = attr(el, "aria-label"); if (aria) meta.ariaLabel = aria.slice(0, 80);
  const title = attr(el, "title"); if (title) meta.title = title.slice(0, 80);
  const name = attr(el, "name"); if (name) meta.name = name.slice(0, 60);
  const id = attr(el, "id"); if (id) meta.id = id.slice(0, 60);
  const classes = (el.getAttribute("class") || "").split(/\s+/).filter(c => c && !/^(css-|sc-)/.test(c)).slice(0, 4).join(" ");
  if (classes) meta.classes = classes.slice(0, 80);
  if (el.tagName === "A") {
    const href = el.getAttribute("href");
    if (href && !href.startsWith("javascript:")) {
      try { meta.href = new URL(href, location.href).href.slice(0, 200); } catch { meta.href = href.slice(0, 200); }
    }
  }
  const icon = detectIcon(el); if (icon) meta.icon = icon.slice(0, 60);
  const section = nearestSection(el); if (section) meta.section = section;
  meta.selector = shortSelector(el);
  const placeholder = attr(el, "placeholder"); if (placeholder) meta.placeholder = placeholder.slice(0, 60);
  const inputEl = el as HTMLInputElement;
  if (["checkbox", "radio"].includes(inputEl.type) || role === "switch" || role === "checkbox") {
    meta.checked = String(inputEl.checked ?? attr(el, "aria-checked") === "true");
  }
  return meta;
}

function cleanLabel(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

// Pull a human-readable label from a single element's own attributes/content.
function labelFromElement(el: Element): string {
  // 1. Explicit accessibility / tooltip attributes
  const attrLabel =
    cleanLabel(el.getAttribute("aria-label")) ||
    cleanLabel(el.getAttribute("title")) ||
    cleanLabel(el.getAttribute("data-tooltip")) ||
    cleanLabel(el.getAttribute("data-title")) ||
    cleanLabel(el.getAttribute("data-label")) ||
    cleanLabel(el.getAttribute("alt")) ||
    cleanLabel(el.getAttribute("placeholder")) ||
    cleanLabel(el.getAttribute("name")) ||
    cleanLabel(el.getAttribute("value"));
  if (attrLabel && attrLabel.length >= 1) return attrLabel;

  // 2. aria-labelledby → resolve referenced element text
  const labelledby = el.getAttribute("aria-labelledby");
  if (labelledby) {
    const ref = document.getElementById(labelledby.split(/\s+/)[0]);
    const txt = cleanLabel((ref as HTMLElement | null)?.innerText);
    if (txt) return txt;
  }

  // 3. Visible text (first line)
  const text = firstLine(cleanLabel((el as HTMLElement).innerText));
  if (text && text.length >= 1 && text.length <= 60) return text;

  // 4. Child with a label (icon buttons often wrap a labelled svg/img/span)
  const labelledChild = el.querySelector("[aria-label],[title],img[alt]");
  if (labelledChild) {
    const childLabel =
      cleanLabel(labelledChild.getAttribute("aria-label")) ||
      cleanLabel(labelledChild.getAttribute("title")) ||
      cleanLabel(labelledChild.getAttribute("alt"));
    if (childLabel) return childLabel;
  }

  // 5. SVG <title>
  const svgTitle = cleanLabel(el.querySelector("svg title")?.textContent);
  if (svgTitle) return svgTitle;

  // 6. data-testid (machine-y but better than nothing)
  const testid = cleanLabel(el.getAttribute("data-testid"))?.replace(/[-_]/g, " ");
  if (testid) return testid;

  return "";
}

// Derive a hint from a link's href or an element's id/class as a last resort.
function structuralHint(el: Element): string {
  if (el.tagName === "A") {
    const href = el.getAttribute("href");
    if (href && !href.startsWith("javascript:") && href !== "#") {
      try {
        const u = new URL(href, location.href);
        const path = (u.pathname + u.search).replace(/\/$/, "");
        if (path && path !== "/") return `link ${path.slice(0, 50)}`;
      } catch { /* relative weirdness */ }
    }
  }
  const id = cleanLabel(el.getAttribute("id"));
  if (id) return id.replace(/[-_]/g, " ").slice(0, 50);
  const cls = cleanLabel(el.getAttribute("class")).split(" ")[0];
  if (cls && !/^[a-z]{1,3}\d|css-|sc-/.test(cls)) return `${el.tagName.toLowerCase()}.${cls}`.slice(0, 50);
  return "";
}

function getClickLabel(target: Element): { label: string; tag: string } {
  const interactive = target.closest(
    'button, a, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="option"], [role="checkbox"], [role="switch"], input, select, label, summary'
  );
  // Try the interactive ancestor first, then the exact target, then walk up.
  const ordered: Element[] = [];
  if (interactive) ordered.push(interactive);
  ordered.push(target);
  let up: Element | null = (interactive ?? target).parentElement;
  for (let i = 0; i < 4 && up; i++) { ordered.push(up); up = up.parentElement; }

  for (const el of ordered) {
    const label = labelFromElement(el);
    if (label) return { label: label.slice(0, 80), tag: el.tagName.toLowerCase() };
  }

  // Structural fallback (href / id / class) before generic placeholder
  for (const el of ordered) {
    const hint = structuralHint(el);
    if (hint) return { label: hint, tag: el.tagName.toLowerCase() };
  }

  const base = interactive ?? target;
  return { label: `${base.tagName.toLowerCase()} (no label)`, tag: base.tagName.toLowerCase() };
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
