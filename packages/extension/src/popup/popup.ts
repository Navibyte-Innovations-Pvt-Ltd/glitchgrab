type PanelId = "idle" | "recording" | "done";

const badge = document.getElementById("badge")!;
const panels: Record<PanelId, HTMLElement> = {
  idle:      document.getElementById("panel-idle")!,
  recording: document.getElementById("panel-recording")!,
  done:      document.getElementById("panel-done")!,
};

const countEl     = document.getElementById("count")!;
const countDoneEl = document.getElementById("count-done")!;
const sessionIdEl = document.getElementById("session-id")!;

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
    sessionIdEl.textContent = s.sessionId;
    countDoneEl.textContent = `${s.eventCount} events saved`;
    showPanel("done");
  } else {
    badge.textContent = "idle";
    badge.className = "badge";
    showPanel("idle");
  }
}

// Check if dev server is reachable
const connEl = document.getElementById("conn")!;
fetch("http://localhost:3000/api/v1/capture-signal", { cache: "no-store" })
  .then(() => { connEl.textContent = "🟢"; connEl.title = "Server connected"; })
  .catch(() => { connEl.textContent = "🔴"; connEl.title = "Server offline — run bun dev"; });

chrome.runtime.sendMessage({ type: "GET_STATE" }, (s) => { if (s) render(s); });
chrome.runtime.onMessage.addListener((msg) => { if (msg.type === "STATE_UPDATE") render(msg.state); });

document.getElementById("btn-start")!.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "MANUAL_START" });
});

document.getElementById("btn-stop")!.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "MANUAL_STOP" });
});

document.getElementById("btn-copy-id")!.addEventListener("click", () => {
  const id = sessionIdEl.textContent ?? "";
  navigator.clipboard.writeText(id).then(() => {
    const btn = document.getElementById("btn-copy-id")!;
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = "Copy Session ID"; }, 1800);
  });
});

document.getElementById("btn-new-from-done")!.addEventListener("click", () => {
  badge.textContent = "idle";
  badge.className = "badge";
  showPanel("idle");
});
