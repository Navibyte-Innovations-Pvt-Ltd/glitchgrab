// src/popup/popup.ts
var badge = document.getElementById("badge");
var status = document.getElementById("status");
var btnToggle = document.getElementById("btn-toggle");
var result = document.getElementById("result");
var sessionIdEl = document.getElementById("session-id");
var btnCopy = document.getElementById("btn-copy");
var count = document.getElementById("count");
function render(s) {
  if (s.active) {
    badge.textContent = "recording";
    badge.className = "badge active";
    btnToggle.textContent = "Stop Capture";
    btnToggle.className = "btn btn-stop";
    status.textContent = "Capturing clicks... Press Ctrl+Shift+R or click Stop when done.";
    count.style.display = "block";
    count.textContent = `${s.eventCount} event${s.eventCount !== 1 ? "s" : ""} captured`;
    result.style.display = "none";
  } else if (s.sessionId) {
    badge.textContent = "done";
    badge.className = "badge done";
    btnToggle.textContent = "New Capture";
    btnToggle.className = "btn btn-start";
    status.textContent = "Session ready. Paste the ID into the Recordly extension to generate a script.";
    result.style.display = "flex";
    sessionIdEl.textContent = s.sessionId;
    count.style.display = "block";
    count.textContent = `${s.eventCount} events uploaded`;
  } else {
    badge.textContent = "idle";
    badge.className = "badge";
    btnToggle.textContent = "Start Capture";
    btnToggle.className = "btn btn-start";
    status.textContent = 'Press Ctrl+Shift+R or "Start Capture" before you begin recording in Recordly.';
    result.style.display = "none";
    count.style.display = "none";
  }
}
chrome.runtime.sendMessage({ type: "GET_STATE" }, (s) => {
  if (s) render(s);
});
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "STATE_UPDATE") render(msg.state);
});
btnToggle.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (s) => {
    if (s?.active) {
      chrome.runtime.sendMessage({ type: "MANUAL_STOP" });
    } else {
      chrome.runtime.sendMessage({ type: "MANUAL_START" });
    }
  });
});
btnCopy.addEventListener("click", () => {
  const id = sessionIdEl.textContent ?? "";
  navigator.clipboard.writeText(id).then(() => {
    btnCopy.textContent = "Copied!";
    setTimeout(() => {
      btnCopy.textContent = "Copy ID";
    }, 2e3);
  });
});
