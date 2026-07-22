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

// ── Tester login (work-time tracking + bug attribution, #297) ──
const testerLoggedOut = document.getElementById("tester-loggedout")!;
const testerLoggedIn  = document.getElementById("tester-loggedin")!;
const testerForm      = document.getElementById("tester-form") as HTMLFormElement;
const testerNameEl    = document.getElementById("tester-name")!;
const testerTimerEl   = document.getElementById("tester-timer")!;
const testerErrorEl   = document.getElementById("tester-error")!;
const testerLoginBtn  = document.getElementById("tester-login-btn")!;
const testerCancelBtn = document.getElementById("tester-cancel")!;
const testerLogoutBtn = document.getElementById("tester-logout-btn")!;
const tokenInput = document.getElementById("tester-token") as HTMLInputElement;
const nameInput  = document.getElementById("tester-name-input") as HTMLInputElement;
const emailInput = document.getElementById("tester-email-input") as HTMLInputElement;

let testerTimerHandle: ReturnType<typeof setInterval> | null = null;

function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}m` : `${m}m${String(sec).padStart(2, "0")}s`;
}

function renderTesterStatus(s: { loggedIn: boolean; name?: string; loginAt?: number }) {
  if (testerTimerHandle) { clearInterval(testerTimerHandle); testerTimerHandle = null; }
  if (s.loggedIn) {
    testerLoggedOut.style.display = "none";
    testerForm.style.display = "none";
    testerLoggedIn.style.display = "flex";
    testerNameEl.textContent = s.name ?? "Tester";
    const loginAt = s.loginAt ?? Date.now();
    const tick = () => { testerTimerEl.textContent = formatElapsed(Date.now() - loginAt); };
    tick();
    testerTimerHandle = setInterval(tick, 1000);
  } else {
    testerLoggedIn.style.display = "none";
    testerForm.style.display = "none";
    testerLoggedOut.style.display = "flex";
  }
}

chrome.runtime.sendMessage({ type: "GET_TESTER_STATUS" }, (s) => { if (s) renderTesterStatus(s); });

testerLoginBtn.addEventListener("click", () => {
  testerLoggedOut.style.display = "none";
  testerForm.style.display = "flex";
  testerErrorEl.style.display = "none";
  tokenInput.focus();
});

testerCancelBtn.addEventListener("click", () => {
  testerForm.style.display = "none";
  testerLoggedOut.style.display = "flex";
});

testerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const token = tokenInput.value.trim();
  const name = nameInput.value.trim();
  const email = emailInput.value.trim() || undefined;
  if (!token || !name) {
    testerErrorEl.textContent = "Token and name are required.";
    testerErrorEl.style.display = "block";
    return;
  }
  const submitBtn = testerForm.querySelector<HTMLButtonElement>(".tester-submit")!;
  submitBtn.disabled = true;
  submitBtn.textContent = "Logging in…";
  chrome.runtime.sendMessage({ type: "TESTER_LOGIN", token, name, email }, (res) => {
    submitBtn.disabled = false;
    submitBtn.textContent = "Log in";
    if (res?.ok) {
      tokenInput.value = "";
      renderTesterStatus({ loggedIn: true, name, loginAt: Date.now() });
    } else {
      testerErrorEl.textContent = res?.error ?? "Login failed.";
      testerErrorEl.style.display = "block";
    }
  });
});

testerLogoutBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "TESTER_LOGOUT" }, () => {
    renderTesterStatus({ loggedIn: false });
  });
});

// ── Init + live updates ────────────────────────────────────────
chrome.runtime.sendMessage({ type: "GET_STATE" }, (s) => { if (s) render(s); });
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "STATE_UPDATE") {
    render(msg.state);
    if (logVisible) refreshLog();
  }
});
