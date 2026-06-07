// Pure DOM → label/metadata extraction. No chrome.* calls, so it's unit-testable
// with jsdom. content.ts imports getClickLabel + describeElement from here.

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
  fullText?: string;       // full visible text of the element (not just first line)
  controls?: string;       // labels of child buttons/links inside it (e.g. "Add", "Claim")
}

function firstLine(text: string): string {
  return text.split(/[\n\r]/).map(s => s.trim()).find(s => s.length > 0) ?? "";
}

function cleanLabel(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
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

export function describeElement(target: Element): ElementMeta {
  const interactive = target.closest(
    'button, a, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="option"], [role="checkbox"], [role="switch"], input, select, textarea, label, summary'
  );
  const el = (interactive ?? target) as HTMLElement;
  const meta: ElementMeta = {};
  meta.tag = el.tagName.toLowerCase();
  const role = attr(el, "role") || implicitRole(el);
  if (role) meta.role = role;
  if (el.tagName === "INPUT") meta.inputType = (el as HTMLInputElement).type;
  // firstLine FIRST (on raw text so newlines still delimit), THEN collapse
  // spaces. Collapsing before would erase newlines and return the whole blob.
  const text = cleanLabel(firstLine(el.innerText || ""));
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

  // Richer context — the full text of the element + the labels of any child
  // buttons/links inside it (e.g. "Add" vs "Claim"). Helps explain what an
  // element offers when the short label alone (a row title) isn't enough.
  const fullText = cleanLabel((el as HTMLElement).innerText);
  if (fullText && fullText !== meta.text) meta.fullText = fullText.slice(0, 240);
  const controlEls = Array.from(
    el.querySelectorAll('button, a, [role="button"], [role="link"], [role="menuitem"]'),
  ).slice(0, 8);
  const controlLabels = controlEls
    .map((c) => labelFromElement(c) || detectIcon(c))
    .map((l) => cleanLabel(l))
    .filter((l) => l && l.length <= 40);
  const uniqueControls = Array.from(new Set(controlLabels));
  if (uniqueControls.length) meta.controls = uniqueControls.join(", ").slice(0, 160);

  return meta;
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

  // 3. Visible text (first line) — firstLine on RAW text, then clean, so a
  // multi-child container resolves to its own first line, not the whole blob.
  const text = cleanLabel(firstLine((el as HTMLElement).innerText));
  if (text && text.length >= 1 && text.length <= 60) return text;

  // 4. Child with a label (icon buttons wrap a labelled svg/img/span). ONLY for
  // small/interactive elements — on a big container this would scrape an
  // unrelated descendant's alt (e.g. a card logo) far from where the user clicked.
  const isInteractiveOrIcon = el.matches(
    'button, a, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="option"], summary, label'
  );
  if (isInteractiveOrIcon) {
    const labelledChild = el.querySelector("[aria-label],[title],img[alt]");
    if (labelledChild) {
      const childLabel =
        cleanLabel(labelledChild.getAttribute("aria-label")) ||
        cleanLabel(labelledChild.getAttribute("title")) ||
        cleanLabel(labelledChild.getAttribute("alt"));
      if (childLabel) return childLabel;
    }
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

// `interactive` = the click landed on/inside a real control. `weak` = no proper
// label was found (only a structural hint or none) — callers use !interactive &&
// weak to drop pure-layout clicks (clicking blank container area).
export function getClickLabel(
  target: Element
): { label: string; tag: string; interactive: boolean; weak: boolean } {
  const interactiveEl = target.closest(
    'button, a, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="option"], [role="checkbox"], [role="switch"], input, select, label, summary'
  );
  const interactive = !!interactiveEl;
  // Try the interactive ancestor first, then the exact target, then walk up.
  const ordered: Element[] = [];
  if (interactiveEl) ordered.push(interactiveEl);
  ordered.push(target);
  let up: Element | null = (interactiveEl ?? target).parentElement;
  for (let i = 0; i < 4 && up; i++) { ordered.push(up); up = up.parentElement; }

  for (const el of ordered) {
    const label = labelFromElement(el);
    if (label) return { label: label.slice(0, 80), tag: el.tagName.toLowerCase(), interactive, weak: false };
  }

  // Structural fallback (href / id / class) before generic placeholder — weak.
  for (const el of ordered) {
    const hint = structuralHint(el);
    if (hint) return { label: hint, tag: el.tagName.toLowerCase(), interactive, weak: true };
  }

  const base = interactiveEl ?? target;
  return { label: `${base.tagName.toLowerCase()} (no label)`, tag: base.tagName.toLowerCase(), interactive, weak: true };
}
