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

// ── Tester status (work-time tracking + bug attribution, #297) ──
// Auto-login only — the QA magic-link page logs the tester in silently.
// Nothing shown here until that happens; no manual login UI.
const testerBar       = document.getElementById("tester-bar")!;
const testerNameEl    = document.getElementById("tester-name")!;
const testerLogoutBtn = document.getElementById("tester-logout-btn")!;

function renderTesterStatus(s: { loggedIn: boolean; name?: string }) {
  if (s.loggedIn) {
    testerBar.style.display = "block";
    testerNameEl.textContent = s.name ?? "Tester";
  } else {
    testerBar.style.display = "none";
  }
}

chrome.runtime.sendMessage({ type: "GET_TESTER_STATUS" }, (s) => { if (s) renderTesterStatus(s); });

testerLogoutBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "TESTER_LOGOUT" }, () => {
    renderTesterStatus({ loggedIn: false });
  });
});

// ── Report Bug (#297) — opens a persistent window hosting the shared
// @glitchgrab/report-ui dialog. Popup would unload on blur mid-report.
const btnReport = document.getElementById("btn-report") as HTMLButtonElement;
btnReport.addEventListener("click", () => {
  btnReport.disabled = true;
  chrome.runtime.sendMessage({ type: "OPEN_REPORT_WINDOW" }, (res) => {
    btnReport.disabled = false;
    if (!res?.ok) {
      btnReport.textContent = res?.error ? `⚠ ${res.error}` : "⚠ Couldn't open";
      setTimeout(() => { btnReport.textContent = "🐞 Report Bug"; }, 2500);
      return;
    }
    window.close();
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

// ── Meeting recording (#311 Phase B) ───────────────────────────
// The developer records; the client joins the call as normal and installs
// nothing. Login is required — unlike event capture, a recording has to be
// stored against a project the server can verify the operator may write to.

interface MeetingContext {
  active: boolean;
  meetingId: string | null;
  repoFullName: string | null;
  startedAt: number | null;
  error: string | null;
  loggedIn: boolean;
  onMeetingPage: boolean;
  tabTitle: string | null;
  repos: { id: string; fullName: string }[];
}

const meetingBox   = document.getElementById("meeting-box") as HTMLElement;
const meetingSetup = document.getElementById("meeting-setup") as HTMLElement;
const meetingLive  = document.getElementById("meeting-live") as HTMLElement;
const meetingRepo  = document.getElementById("meeting-repo") as HTMLSelectElement;
const meetingName  = document.getElementById("meeting-name") as HTMLInputElement;
const meetingStart = document.getElementById("meeting-start") as HTMLButtonElement;
const meetingStop  = document.getElementById("meeting-stop") as HTMLButtonElement;
const meetingMic   = document.getElementById("meeting-mic") as HTMLButtonElement;
const meetingHint  = document.getElementById("meeting-hint") as HTMLElement;
const meetingTimer = document.getElementById("meeting-timer") as HTMLElement;
const meetingLiveRepo = document.getElementById("meeting-live-repo") as HTMLElement;

let meetingTimerId: ReturnType<typeof setInterval> | null = null;

/**
 * Mic permission must be granted from a real extension page — an offscreen
 * document cannot show a prompt, so asking at record time fails silently and
 * loses the operator's side of the call. This asks once, here, up front.
 */
async function micGranted(): Promise<boolean> {
  try {
    const status = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return status.state === "granted";
  } catch {
    return false;
  }
}

meetingMic.addEventListener("click", async () => {
  meetingMic.disabled = true;
  meetingMic.textContent = "Waiting for permission…";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // The grant is what we wanted; release the device immediately.
    stream.getTracks().forEach((t) => t.stop());
    meetingMic.style.display = "none";
  } catch {
    meetingMic.textContent = "Microphone blocked — allow it in Chrome settings";
  } finally {
    meetingMic.disabled = false;
  }
});

function renderTimer(startedAt: number | null) {
  if (meetingTimerId) { clearInterval(meetingTimerId); meetingTimerId = null; }
  if (!startedAt) { meetingTimer.textContent = ""; return; }

  const tick = () => {
    const secs = Math.floor((Date.now() - startedAt) / 1000);
    const m = String(Math.floor(secs / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    meetingTimer.textContent = `${m}:${s}`;
  };
  tick();
  meetingTimerId = setInterval(tick, 1000);
}

async function renderMeeting(ctx: MeetingContext) {
  if (!ctx.loggedIn) { meetingBox.style.display = "none"; return; }
  meetingBox.style.display = "flex";

  if (ctx.active) {
    meetingSetup.style.display = "none";
    meetingLive.style.display  = "block";
    // Surface the project DURING the call — a recording filed against the wrong
    // one is only fixable while it's still running.
    meetingLiveRepo.textContent = ctx.repoFullName ? `→ ${ctx.repoFullName}` : "";
    renderTimer(ctx.startedAt);
    return;
  }

  meetingSetup.style.display = "block";
  meetingLive.style.display  = "none";
  renderTimer(null);

  meetingMic.style.display = (await micGranted()) ? "none" : "block";

  // Preserve the operator's choice across popup re-opens — the popup unloads
  // on blur, and re-picking the project every time is exactly the kind of
  // friction that gets a call recorded against the wrong repo.
  const previous = meetingRepo.value;
  if (meetingRepo.options.length !== ctx.repos.length) {
    meetingRepo.innerHTML = "";
    for (const r of ctx.repos) {
      const opt = document.createElement("option");
      opt.value = r.id;
      opt.textContent = r.fullName;
      meetingRepo.appendChild(opt);
    }
  }
  const stored = (await chrome.storage.local.get("gg_meeting_repo")).gg_meeting_repo as string | undefined;
  if (previous) meetingRepo.value = previous;
  else if (stored && ctx.repos.some((r) => r.id === stored)) meetingRepo.value = stored;

  if (ctx.repos.length === 0) {
    meetingStart.disabled = true;
    meetingHint.textContent = "No projects available for this login.";
    return;
  }

  meetingStart.disabled = false;
  meetingHint.textContent = ctx.onMeetingPage
    ? "Records this tab's audio plus your mic. Tell everyone first."
    : "Open the meeting tab first — this records the ACTIVE tab's audio.";
}

meetingStart.addEventListener("click", () => {
  meetingStart.disabled = true;
  meetingStart.textContent = "Starting…";
  void chrome.storage.local.set({ gg_meeting_repo: meetingRepo.value });

  chrome.runtime.sendMessage(
    { type: "MEETING_START", repoId: meetingRepo.value, title: meetingName.value },
    (res) => {
      meetingStart.textContent = "● Record this call";
      meetingStart.disabled = false;
      if (!res?.ok) {
        meetingHint.textContent = res?.error ?? "Could not start recording";
        return;
      }
      refreshMeeting();
    }
  );
});

meetingStop.addEventListener("click", () => {
  meetingStop.disabled = true;
  meetingStop.textContent = "Uploading…";

  chrome.runtime.sendMessage({ type: "MEETING_STOP" }, (res) => {
    meetingStop.disabled = false;
    meetingStop.textContent = "■ Stop & save";
    refreshMeeting();
    if (!res?.ok) {
      meetingHint.textContent = res?.error ?? "Upload failed";
    } else {
      meetingHint.textContent = res.sarvamUploaded
        ? "Saved. Transcribing — check the dashboard."
        : "Saved. Transcription unavailable; the audio is stored.";
    }
  });
});

function refreshMeeting() {
  chrome.runtime.sendMessage({ type: "GET_MEETING_STATE" }, (ctx: MeetingContext) => {
    if (ctx) void renderMeeting(ctx);
  });
}
refreshMeeting();
