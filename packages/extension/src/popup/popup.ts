type PanelId = "idle" | "recording" | "done";

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

// Connection indicator
const connEl = document.getElementById("conn")!;
fetch("http://localhost:3000/api/v1/capture-signal", { cache: "no-store" })
  .then(() => { connEl.textContent = "🟢"; connEl.title = "Server connected"; })
  .catch(() => { connEl.textContent = "🔴"; connEl.title = "Server offline"; });

chrome.runtime.sendMessage({ type: "GET_STATE" }, (s) => { if (s) render(s); });
chrome.runtime.onMessage.addListener((msg) => { if (msg.type === "STATE_UPDATE") render(msg.state); });
