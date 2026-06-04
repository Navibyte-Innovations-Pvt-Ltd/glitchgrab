type PanelId = "idle" | "recording" | "done";

interface CaptureEvent {
  type: string;
  t: number;
  label?: string;
  tag?: string;
  url?: string;
  durationMs?: number;
  preview?: string;
}

const badge = document.getElementById("badge")!;
const panels: Record<PanelId, HTMLElement> = {
  idle:      document.getElementById("panel-idle")!,
  recording: document.getElementById("panel-recording")!,
  done:      document.getElementById("panel-done")!,
};

const countEl     = document.getElementById("count")!;
const countDoneEl = document.getElementById("count-done")!;

function showPanel(id: PanelId) {
  for (const [key, el] of Object.entries(panels)) {
    el.style.display = key === id ? "flex" : "none";
  }
}

function render(s: { active: boolean; eventCount: number; sessionId: string | null }) {
  if (s.active) {
    badge.textContent = "recording";
    badge.className = "badge active";
    countEl.textContent = `${s.eventCount} event${s.eventCount !== 1 ? "s" : ""} captured`;
    showPanel("recording");
  } else if (s.sessionId) {
    badge.textContent = "done";
    badge.className = "badge done";
    countDoneEl.textContent = `${s.eventCount} events sent`;
    showPanel("done");
  } else {
    badge.textContent = "idle";
    badge.className = "badge";
    showPanel("idle");
  }
}

// ── Connection indicator ───────────────────────────────────────
const connEl = document.getElementById("conn")!;
fetch("http://localhost:3000/api/v1/capture-signal", { cache: "no-store" })
  .then(() => { connEl.textContent = "🟢"; connEl.title = "Server connected"; })
  .catch(() => { connEl.textContent = "🔴"; connEl.title = "Server offline"; });

// ── Event log panel ────────────────────────────────────────────
const btnLog   = document.getElementById("btn-log")!;
const panelLog = document.getElementById("panel-log")!;
const logList  = document.getElementById("log-list")!;
const logCount = document.getElementById("log-count")!;
let logVisible = false;

const EVENT_ICONS: Record<string, string> = {
  click:    "↖",
  navigate: "→",
  idle:     "⏸",
  input:    "⌨",
  select:   "⬚",
  keydown:  "⏎",
  scroll:   "↕",
  copy:     "⎘",
  paste:    "⎙",
};

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m${s % 60}s`;
  return `${s}s`;
}

function renderLog(events: CaptureEvent[]) {
  logCount.textContent = `${events.length} event${events.length !== 1 ? "s" : ""}`;
  if (events.length === 0) {
    logList.innerHTML = '<div class="log-empty">No events captured yet.</div>';
    return;
  }
  logList.innerHTML = events.map(ev => {
    const icon = EVENT_ICONS[ev.type] ?? "•";
    const detail = ev.preview
      ? `"${ev.preview.slice(0, 30)}"`
      : (ev.label ?? ev.url ?? "").slice(0, 40);
    return `<div class="log-item">
      <span class="log-icon" title="${ev.type}">${icon}</span>
      <div class="log-body">
        <span class="log-type">${ev.type}</span>
        <span class="log-detail">${detail}</span>
      </div>
      <span class="log-time">${formatMs(ev.t)}</span>
    </div>`;
  }).join("");
  logList.scrollTop = logList.scrollHeight;
}

function refreshLog() {
  chrome.runtime.sendMessage({ type: "GET_EVENTS" }, (resp) => {
    if (resp?.events) renderLog(resp.events);
  });
}

btnLog.addEventListener("click", () => {
  logVisible = !logVisible;
  panelLog.style.display = logVisible ? "flex" : "none";
  btnLog.classList.toggle("active", logVisible);
  if (logVisible) refreshLog();
});

// ── Init + live updates ────────────────────────────────────────
chrome.runtime.sendMessage({ type: "GET_STATE" }, (s) => { if (s) render(s); });
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "STATE_UPDATE") {
    render(msg.state);
    if (logVisible) refreshLog();
  }
});
