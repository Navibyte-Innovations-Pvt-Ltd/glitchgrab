// src/popup/popup.ts
var API_BASE = "https://glitchgrab.dev/api/v1";
var badge = document.getElementById("badge");
var panels = {
  idle: document.getElementById("panel-idle"),
  recording: document.getElementById("panel-recording"),
  done: document.getElementById("panel-done"),
  generating: document.getElementById("panel-generating"),
  script: document.getElementById("panel-script")
};
var countEl = document.getElementById("count");
var countDoneEl = document.getElementById("count-done");
var sessionIdEl = document.getElementById("session-id");
var scriptBox = document.getElementById("script-box");
var wordCountEl = document.getElementById("word-count");
var currentSessionId = null;
function showPanel(id) {
  for (const [key, el] of Object.entries(panels)) {
    el.style.display = key === id ? "flex" : "none";
  }
}
function render(s) {
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
chrome.runtime.sendMessage({ type: "GET_STATE" }, (s) => {
  if (s) render(s);
});
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "STATE_UPDATE") render(msg.state);
});
document.getElementById("btn-start").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "MANUAL_START" });
});
document.getElementById("btn-stop").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "MANUAL_STOP" });
});
document.getElementById("btn-copy-id").addEventListener("click", () => {
  const id = sessionIdEl.textContent ?? "";
  navigator.clipboard.writeText(id).then(() => {
    const btn = document.getElementById("btn-copy-id");
    btn.textContent = "Copied!";
    setTimeout(() => {
      btn.textContent = "Copy ID";
    }, 1800);
  });
});
document.getElementById("btn-generate").addEventListener("click", async () => {
  if (!currentSessionId) return;
  showPanel("generating");
  badge.textContent = "generating";
  badge.className = "badge ready";
  try {
    const res = await fetch(`${API_BASE}/capture-sessions/${currentSessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
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
    navigator.clipboard.writeText(script).catch(() => {
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    badge.textContent = "error";
    badge.className = "badge";
    showPanel("done");
    const countEl2 = document.getElementById("count-done");
    countEl2.textContent = `Error: ${msg}`;
  }
});
document.getElementById("btn-copy-script").addEventListener("click", () => {
  navigator.clipboard.writeText(scriptBox.value).then(() => {
    const btn = document.getElementById("btn-copy-script");
    btn.textContent = "Copied!";
    setTimeout(() => {
      btn.textContent = "Copy Script";
    }, 1800);
  });
});
document.getElementById("btn-new").addEventListener("click", () => {
  currentSessionId = null;
  scriptBox.value = "";
  badge.textContent = "idle";
  badge.className = "badge";
  showPanel("idle");
});
