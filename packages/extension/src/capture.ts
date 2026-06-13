// Capture orchestration — turns raw DOM events (click/input/scroll/idle/…) into
// CaptureEvent payloads. Pure DOM + timers + an injected `emit`, so it is fully
// unit-testable with jsdom + fake timers. content.ts wires `emit` to
// chrome.runtime.sendMessage; tests wire it to an array.
import { type ElementMeta, getClickLabel, describeElement } from "./labeler";

export interface CaptureEvent {
  type: "click" | "navigate" | "idle" | "input" | "select" | "keydown" | "scroll" | "copy" | "paste" | "note";
  label?: string;
  tag?: string;
  url?: string;
  durationMs?: number;
  preview?: string;
  meta?: ElementMeta;
  note?: string; // for "note" events: free-text or "explain this" marker
}

const DEDUP_MS = 80;

// One-time codes / OTP / PIN / CVV are short-lived secrets — their value must
// never land in the capture log even though they aren't type=password. Detect by
// autocomplete, a code-ish name/label, or an anonymous short numeric field (the
// typical unlabelled OTP digit box).
function isSensitiveCode(el: HTMLInputElement): boolean {
  if (!el || el.tagName !== "INPUT") return false;
  if (el.autocomplete === "one-time-code") return true;
  const id = (el.name || el.id || el.getAttribute("aria-label") || el.placeholder || "").toLowerCase();
  if (/otp|one[\s-]?time|verification|2fa|mfa|\bpin\b|cvv|cvc|security[\s-]?code/.test(id)) return true;
  if (!id && el.maxLength > 0 && el.maxLength <= 6 && /^\d*$/.test(el.value || "")) return true;
  return false;
}

// Timing knobs — production defaults; tests pass small values for fast, reliable runs.
export interface CaptureTiming {
  inputDebounceMs?: number;
  selDebounceMs?: number;
  scrollDebounceMs?: number;
  idleThresholdMs?: number;
  idleCheckMs?: number;
  minHoldMs?: number; // min Shift-hold to count as an "explain" gesture
}

export class Capture {
  private capturing = false;
  private lastEventAt = 0;
  private idleTimer: ReturnType<typeof setInterval> | null = null;
  private idleStart = 0;
  private inIdle = false;
  private lastClickKey = "";
  private lastClickAt = 0;
  private inputTimer: ReturnType<typeof setTimeout> | null = null;
  private lastInputEl: HTMLInputElement | HTMLTextAreaElement | null = null;
  private selTimer: ReturnType<typeof setTimeout> | null = null;
  private scrollTimer: ReturnType<typeof setTimeout> | null = null;
  private pointerX = 0;
  private pointerY = 0;
  // Hold-Shift "explain this" gesture state.
  private shiftDownAt = 0;             // 0 = Shift not held
  private shiftSubject: Element | null = null; // element under cursor when hold began
  private shiftHadOtherKey = false;    // a letter was typed while Shift held → it's typing, not explain
  private readonly minHoldMs: number;

  private readonly inputDebounceMs: number;
  private readonly selDebounceMs: number;
  private readonly scrollDebounceMs: number;
  private readonly idleThresholdMs: number;
  private readonly idleCheckMs: number;

  constructor(private emit: (event: CaptureEvent) => void, timing: CaptureTiming = {}) {
    this.inputDebounceMs = timing.inputDebounceMs ?? 800;
    this.selDebounceMs = timing.selDebounceMs ?? 500;
    this.scrollDebounceMs = timing.scrollDebounceMs ?? 1500;
    this.idleThresholdMs = timing.idleThresholdMs ?? 3000;
    this.idleCheckMs = timing.idleCheckMs ?? 1000;
    this.minHoldMs = timing.minHoldMs ?? 400;
  }

  get active(): boolean {
    return this.capturing;
  }

  start(): void {
    if (this.capturing) return;
    this.capturing = true;
    this.lastEventAt = Date.now();
    // Record the starting page up front: its title + app name (og:site_name) are
    // the only reliable source of the PRODUCT name for the narration. SPA route
    // changes and the initial load otherwise emit no navigate, so the script
    // never learns what the app is called (was naming it "localhost").
    this.emitNavigate();
    document.addEventListener("click", this.onClick, { capture: true, passive: true });
    document.addEventListener("input", this.onInput, { capture: true, passive: true });
    document.addEventListener("keydown", this.onKeydown, { capture: true, passive: true });
    document.addEventListener("keyup", this.onKeyup, { capture: true, passive: true });
    document.addEventListener("selectionchange", this.onSelectionChange, { passive: true });
    document.addEventListener("scroll", this.onScroll, { capture: true, passive: true });
    document.addEventListener("copy", this.onCopy, { capture: true });
    document.addEventListener("paste", this.onPaste, { capture: true });
    document.addEventListener("mousemove", this.onPointerMove, { capture: true, passive: true });
    this.idleTimer = setInterval(this.checkIdle, this.idleCheckMs);
  }

  stop(): void {
    if (!this.capturing) return;
    this.capturing = false;
    document.removeEventListener("click", this.onClick, { capture: true });
    document.removeEventListener("input", this.onInput, { capture: true });
    document.removeEventListener("keydown", this.onKeydown, { capture: true });
    document.removeEventListener("keyup", this.onKeyup, { capture: true });
    document.removeEventListener("selectionchange", this.onSelectionChange);
    document.removeEventListener("scroll", this.onScroll, { capture: true });
    document.removeEventListener("copy", this.onCopy, { capture: true });
    document.removeEventListener("paste", this.onPaste, { capture: true });
    document.removeEventListener("mousemove", this.onPointerMove, { capture: true });
    if (this.idleTimer) { clearInterval(this.idleTimer); this.idleTimer = null; }
    // Flush any pending debounced input so the last keystrokes aren't lost.
    if (this.inputTimer) {
      clearTimeout(this.inputTimer);
      this.inputTimer = null;
      this.flushInput();
    }
    if (this.selTimer) { clearTimeout(this.selTimer); this.selTimer = null; }
    if (this.scrollTimer) { clearTimeout(this.scrollTimer); this.scrollTimer = null; }
  }

  // Close an open idle span when real activity resumes.
  private breakIdle(now: number): void {
    if (this.inIdle) {
      this.emit({ type: "idle", durationMs: now - this.idleStart });
      this.inIdle = false;
    }
  }

  private checkIdle = (): void => {
    const idleMs = Date.now() - this.lastEventAt;
    if (!this.inIdle && idleMs > this.idleThresholdMs) {
      this.inIdle = true;
      this.idleStart = this.lastEventAt;
    } else if (this.inIdle && idleMs < this.idleThresholdMs) {
      this.emit({ type: "idle", durationMs: Date.now() - this.idleStart });
      this.inIdle = false;
    }
  };

  private onClick = (e: Event): void => {
    if (!this.capturing) return;
    const now = Date.now();
    this.lastEventAt = now;
    this.breakIdle(now);
    const target = e.target as Element;
    const { label, tag, interactive, weak } = getClickLabel(target);
    // Drop pure-layout clicks: clicking blank container area (no control, no own
    // label). These produced phantom events labelled from unrelated descendants.
    if (!interactive && weak) return;
    const clickKey = `${label}::${tag}`;
    if (clickKey === this.lastClickKey && now - this.lastClickAt < DEDUP_MS) return;
    this.lastClickKey = clickKey;
    this.lastClickAt = now;
    this.emit({ type: "click", label, tag, url: location.href, meta: describeElement(target) });
  };

  private flushInput(): void {
    if (!this.lastInputEl) return;
    const { label } = getClickLabel(this.lastInputEl);
    const preview = this.lastInputEl.value.slice(0, 40).replace(/\s+/g, " ").trim();
    this.emit({
      type: "input",
      label,
      tag: this.lastInputEl.tagName.toLowerCase(),
      url: location.href,
      preview: preview || undefined,
      meta: describeElement(this.lastInputEl),
    });
    this.lastInputEl = null;
  }

  private onInput = (e: Event): void => {
    if (!this.capturing) return;
    this.lastEventAt = Date.now();
    this.breakIdle(Date.now());
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    if ((target as HTMLInputElement).type === "password") return;
    if (isSensitiveCode(target as HTMLInputElement)) return; // OTP / 2FA / PIN — never log
    // Switching to a different field mid-debounce: flush the previous one first.
    if (this.lastInputEl && this.lastInputEl !== target) {
      if (this.inputTimer) { clearTimeout(this.inputTimer); this.inputTimer = null; }
      this.flushInput();
    }
    this.lastInputEl = target;
    if (this.inputTimer) clearTimeout(this.inputTimer);
    this.inputTimer = setTimeout(() => {
      try {
        this.inputTimer = null;
        this.flushInput();
      } catch { /* dom detached */ }
    }, this.inputDebounceMs);
  };

  private onPointerMove = (e: Event): void => {
    const m = e as MouseEvent;
    this.pointerX = m.clientX;
    this.pointerY = m.clientY;
  };

  // Mark "explain this" on `el`. The script generator treats `note` events as
  // "spend time here — the user wants this explained" (e.g. Claim vs Add).
  private emitNote(el: Element | null, durationMs: number): void {
    this.lastEventAt = Date.now();
    this.breakIdle(Date.now());
    if (el) {
      const { label } = getClickLabel(el);
      this.emit({ type: "note", label, url: location.href, meta: describeElement(el), note: "explain", durationMs });
    } else {
      this.emit({ type: "note", url: location.href, note: "explain", durationMs });
    }
  }

  private onKeydown = (e: Event): void => {
    if (!this.capturing) return;
    const ke = e as KeyboardEvent;

    // Explain gesture = HOLD Shift. Record when the hold starts + what's under
    // the cursor. Recording continues normally throughout.
    if (ke.key === "Shift") {
      if (!ke.repeat && this.shiftDownAt === 0) {
        this.shiftDownAt = Date.now();
        this.shiftSubject = document.elementFromPoint(this.pointerX, this.pointerY);
        this.shiftHadOtherKey = false;
      }
      return;
    }
    // A real key while Shift is held → the user is typing (capitals/symbols),
    // not explaining. Cancel the explain gesture.
    if (this.shiftDownAt > 0) this.shiftHadOtherKey = true;

    if (!["Enter", "Escape", "Tab"].includes(ke.key)) return;
    this.lastEventAt = Date.now();
    this.breakIdle(Date.now());
    this.emit({ type: "keydown", label: ke.key, url: location.href });
  };

  private onKeyup = (e: Event): void => {
    if (!this.capturing) return;
    if ((e as KeyboardEvent).key !== "Shift" || this.shiftDownAt === 0) return;
    const held = Date.now() - this.shiftDownAt;
    // Use the element under the cursor NOW (key-up) — the user may have pressed
    // Shift then moved the mouse to point at what they want explained. Fall back
    // to the shift-down subject if the current point resolves to nothing.
    const subject =
      document.elementFromPoint(this.pointerX, this.pointerY) ?? this.shiftSubject;
    const wasTyping = this.shiftHadOtherKey;
    this.shiftDownAt = 0;
    this.shiftSubject = null;
    this.shiftHadOtherKey = false;
    // Held long enough AND nothing typed → it was an "explain" hold.
    if (held >= this.minHoldMs && !wasTyping) {
      this.emitNote(subject, held);
    }
  };

  private onSelectionChange = (): void => {
    if (!this.capturing) return;
    if (this.selTimer) clearTimeout(this.selTimer);
    this.selTimer = setTimeout(() => {
      try {
        this.selTimer = null;
        const sel = window.getSelection()?.toString().trim() ?? "";
        if (sel.length >= 3) this.emit({ type: "select", label: sel.slice(0, 80), url: location.href });
      } catch { /* ignore */ }
    }, this.selDebounceMs);
  };

  private onScroll = (): void => {
    if (!this.capturing) return;
    this.lastEventAt = Date.now();
    if (this.scrollTimer) clearTimeout(this.scrollTimer);
    this.scrollTimer = setTimeout(() => {
      try {
        this.scrollTimer = null;
        this.emit({ type: "scroll", url: location.href });
      } catch { /* ignore */ }
    }, this.scrollDebounceMs);
  };

  private onCopy = (): void => {
    if (!this.capturing) return;
    const sel = window.getSelection()?.toString().trim().slice(0, 60) ?? "";
    this.emit({ type: "copy", label: sel || undefined, url: location.href });
  };

  private onPaste = (): void => {
    if (!this.capturing) return;
    this.emit({ type: "paste", url: location.href });
  };

  // Called from content.ts history-API hooks on SPA navigation.
  onNavigate(title: string): void {
    if (!this.capturing) return;
    this.lastEventAt = Date.now();
    this.breakIdle(Date.now());
    this.emitNavigate(title);
  }

  // Emit a navigate event carrying the page title + app/site name so the
  // narration can name the product (and never has to fall back to a hostname).
  private emitNavigate(title?: string): void {
    const site = readSiteName();
    const text = readPageGist(); // hero heading + description → grounds the product framing
    const meta: Record<string, string> = {};
    if (site) meta.site = site;
    if (text) meta.text = text;
    this.emit({
      type: "navigate",
      url: location.href,
      label: (title ?? document.title) || undefined,
      meta: Object.keys(meta).length ? (meta as ElementMeta) : undefined,
    });
  }
}

// The page's gist for the narration model: main heading + meta description. This
// is what lets the scripter say what the product actually does ("find & book
// study rooms") instead of guessing from the brand name ("library software").
function readPageGist(): string | undefined {
  try {
    const desc = (
      document.querySelector('meta[name="description"]') ??
      document.querySelector('meta[property="og:description"]')
    )?.getAttribute("content")?.replace(/\s+/g, " ").trim();
    const h1 = document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim();
    const gist = [h1, desc].filter(Boolean).join(" — ").slice(0, 220);
    return gist || undefined;
  } catch {
    return undefined;
  }
}

// The canonical product/brand name from page metadata (og:site_name, then
// application-name). Independent of the messy <title> SEO string.
function readSiteName(): string | undefined {
  try {
    const og = document
      .querySelector('meta[property="og:site_name"]')
      ?.getAttribute("content");
    if (og && og.trim()) return og.trim().slice(0, 60);
    const app = document
      .querySelector('meta[name="application-name"]')
      ?.getAttribute("content");
    if (app && app.trim()) return app.trim().slice(0, 60);
  } catch { /* no DOM (tests) */ }
  return undefined;
}
