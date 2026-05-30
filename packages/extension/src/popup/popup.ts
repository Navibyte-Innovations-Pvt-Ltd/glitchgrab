const API_BASE = "https://glitchgrab.dev/api/v1";

type PanelId = "idle" | "recording" | "done" | "generating" | "script";

const badge = document.getElementById("badge")!;
const panels: Record<PanelId, HTMLElement> = {
  idle:       document.getElementById("panel-idle")!,
  recording:  document.getElementById("panel-recording")!,
  done:       document.getElementById("panel-done")!,
  generating: document.getElementById("panel-generating")!,
  script:     document.getElementById("panel-script")!,
};

const countEl     = document.getElementById("count")!;
const countDoneEl = document.getElementById("count-done")!;
const sessionIdEl = document.getElementById("session-id")!;
const scriptBox   = document.getElementById("script-box") as HTMLTextAreaElement;
const wordCountEl = document.getElementById("word-count")!;

let currentSessionId: string | null = null;

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
    currentSessionId = s.sessionId;
    sessionIdEl.textContent = s.sessionId;
    countDoneEl.textContent = `${s.eventCount} events uploaded`;
    showPanel("done");
  } else {
    badge.textContent = "idle";
    badge.className = "badge";
    showPanel("idle");
  }
}

// Init
chrome.runtime.sendMessage({ type: "GET_STATE" }, (s) => {
  if (s) render(s);
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "STATE_UPDATE") render(msg.state);
});

// Start
document.getElementById("btn-start")!.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "MANUAL_START" });
});

// Stop
document.getElementById("btn-stop")!.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "MANUAL_STOP" });
});

// Copy session ID
document.getElementById("btn-copy-id")!.addEventListener("click", () => {
  const id = sessionIdEl.textContent ?? "";
  navigator.clipboard.writeText(id).then(() => {
    const btn = document.getElementById("btn-copy-id")!;
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = "Copy ID"; }, 1800);
  });
});

// Generate script
document.getElementById("btn-generate")!.addEventListener("click", async () => {
  if (!currentSessionId) return;
  showPanel("generating");
  badge.textContent = "generating";
  badge.className = "badge ready";

  try {
    const res = await fetch(`${API_BASE}/capture-sessions/${currentSessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json() as { success: boolean; data?: { script: string }; error?: string };

    if (!data.success || !data.data?.script) {
      throw new Error(data.error ?? "Generation failed");
    }

    const script = data.data.script;
    const words = script.split(/\s+/).filter(Boolean).length;

    scriptBox.value = script;
    wordCountEl.textContent = `${words} words`;
    badge.textContent = "ready";
    badge.className = "badge ready";
    showPanel("script");

    // Auto-copy
    navigator.clipboard.writeText(script).catch(() => {});
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    badge.textContent = "error";
    badge.className = "badge";
    showPanel("done");
    const countEl2 = document.getElementById("count-done")!;
    countEl2.textContent = `Error: ${msg}`;
  }
});

// Copy script
document.getElementById("btn-copy-script")!.addEventListener("click", () => {
  navigator.clipboard.writeText(scriptBox.value).then(() => {
    const btn = document.getElementById("btn-copy-script")!;
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = "Copy Script"; }, 1800);
  });
});

// New session
document.getElementById("btn-new")!.addEventListener("click", () => {
  currentSessionId = null;
  scriptBox.value = "";
  badge.textContent = "idle";
  badge.className = "badge";
  showPanel("idle");
});
