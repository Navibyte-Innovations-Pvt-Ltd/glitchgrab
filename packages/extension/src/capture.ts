// Capture orchestration — turns raw DOM events (click/input/scroll/idle/…) into
// CaptureEvent payloads. Pure DOM + timers + an injected `emit`, so it is fully
// unit-testable with jsdom + fake timers. content.ts wires `emit` to
// chrome.runtime.sendMessage; tests wire it to an array.
import { type ElementMeta, getClickLabel, describeElement } from "./labeler";

export interface CaptureEvent {
  type: "click" | "navigate" | "idle" | "input" | "select" | "keydown" | "scroll" | "copy" | "paste";
  label?: string;
  tag?: string;
  url?: string;
  durationMs?: number;
  preview?: string;
  meta?: ElementMeta;
}

const DEDUP_MS = 80;

// Timing knobs — production defaults; tests pass small values for fast, reliable runs.
export interface CaptureTiming {
  inputDebounceMs?: number;
  selDebounceMs?: number;
  scrollDebounceMs?: number;
  idleThresholdMs?: number;
  idleCheckMs?: number;
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
  }

  get active(): boolean {
    return this.capturing;
  }

  start(): void {
    if (this.capturing) return;
    this.capturing = true;
    this.lastEventAt = Date.now();
    document.addEventListener("click", this.onClick, { capture: true, passive: true });
    document.addEventListener("input", this.onInput, { capture: true, passive: true });
    document.addEventListener("keydown", this.onKeydown, { capture: true, passive: true });
    document.addEventListener("selectionchange", this.onSelectionChange, { passive: true });
    document.addEventListener("scroll", this.onScroll, { capture: true, passive: true });
    document.addEventListener("copy", this.onCopy, { capture: true });
    document.addEventListener("paste", this.onPaste, { capture: true });
    this.idleTimer = setInterval(this.checkIdle, this.idleCheckMs);
  }

  stop(): void {
    if (!this.capturing) return;
    this.capturing = false;
    document.removeEventListener("click", this.onClick, { capture: true });
    document.removeEventListener("input", this.onInput, { capture: true });
    document.removeEventListener("keydown", this.onKeydown, { capture: true });
    document.removeEventListener("selectionchange", this.onSelectionChange);
    document.removeEventListener("scroll", this.onScroll, { capture: true });
    document.removeEventListener("copy", this.onCopy, { capture: true });
    document.removeEventListener("paste", this.onPaste, { capture: true });
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
    const { label, tag } = getClickLabel(target);
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

  private onKeydown = (e: Event): void => {
    if (!this.capturing) return;
    const key = (e as KeyboardEvent).key;
    if (!["Enter", "Escape", "Tab"].includes(key)) return;
    this.lastEventAt = Date.now();
    this.breakIdle(Date.now());
    this.emit({ type: "keydown", label: key, url: location.href });
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
    this.emit({ type: "navigate", url: location.href, label: title });
  }
}
