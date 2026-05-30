// src/background.ts
var state = {
  active: false,
  startedAt: null,
  events: [],
  sessionId: null
};
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-capture") {
    if (state.active) {
      stopCapture();
    } else {
      startCapture();
    }
  }
});
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "CAPTURE_EVENT" && state.active && state.startedAt !== null) {
    const event = {
      ...msg.event,
      t: Date.now() - state.startedAt
    };
    state.events.push(event);
  }
  return false;
});
function startCapture() {
  state.active = true;
  state.startedAt = Date.now();
  state.events = [];
  state.sessionId = null;
  broadcastState();
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: "CAPTURE_START" }).catch(() => {
        });
      }
    }
  });
}
async function stopCapture() {
  state.active = false;
  broadcastState();
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: "CAPTURE_STOP" }).catch(() => {
        });
      }
    }
  });
  if (state.events.length === 0) return;
  try {
    const res = await fetch("https://glitchgrab.dev/api/v1/capture-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: state.events })
    });
    const data = await res.json();
    if (data.success) {
      state.sessionId = data.data.sessionId;
      broadcastState();
    }
  } catch {
    await chrome.storage.local.set({ pendingEvents: state.events });
  }
}
function broadcastState() {
  chrome.runtime.sendMessage({
    type: "STATE_UPDATE",
    state: {
      active: state.active,
      eventCount: state.events.length,
      sessionId: state.sessionId
    }
  }).catch(() => {
  });
}
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === "GET_STATE") {
    reply({
      active: state.active,
      eventCount: state.events.length,
      sessionId: state.sessionId
    });
    return true;
  }
  if (msg.type === "MANUAL_START") {
    startCapture();
    return false;
  }
  if (msg.type === "MANUAL_STOP") {
    stopCapture();
    return false;
  }
  return false;
});
