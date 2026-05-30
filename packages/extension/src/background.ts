// Session state
interface CaptureState {
  active: boolean;
  startedAt: number | null;
  events: CaptureEvent[];
  sessionId: string | null;
}

export interface CaptureEvent {
  type: "click" | "navigate" | "idle";
  t: number; // ms from capture start
  label?: string;
  tag?: string;
  url?: string;
  durationMs?: number;
}

const state: CaptureState = {
  active: false,
  startedAt: null,
  events: [],
  sessionId: null,
};

// Toggle capture on hotkey
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-capture") {
    if (state.active) {
      stopCapture();
    } else {
      startCapture();
    }
  }
});

// Receive events from content script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "CAPTURE_EVENT" && state.active && state.startedAt !== null) {
    const event: CaptureEvent = {
      ...msg.event,
      t: Date.now() - state.startedAt,
    };
    state.events.push(event);
  }
  return false;
});

function setRecordingBadge(recording: boolean) {
  if (recording) {
    chrome.action.setBadgeText({ text: " " });
    chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

function startCapture() {
  state.active = true;
  state.startedAt = Date.now();
  state.events = [];
  state.sessionId = null;
  setRecordingBadge(true);
  broadcastState();
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: "CAPTURE_START" }).catch(() => {});
      }
    }
  });
}

async function stopCapture() {
  state.active = false;
  setRecordingBadge(false);
  broadcastState();

  // Notify tabs to stop
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: "CAPTURE_STOP" }).catch(() => {});
      }
    }
  });

  if (state.events.length === 0) return;

  // POST events to API
  try {
    const res = await fetch("http://localhost:3000/api/v1/capture-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: state.events }),
    });
    const data = await res.json();
    if (data.success) {
      state.sessionId = data.data.sessionId;
      broadcastState();
    }
  } catch {
    // Network error — store events locally so user can retry
    await chrome.storage.local.set({ pendingEvents: state.events });
  }
}

function broadcastState() {
  chrome.runtime.sendMessage({
    type: "STATE_UPDATE",
    state: {
      active: state.active,
      eventCount: state.events.length,
      sessionId: state.sessionId,
    },
  }).catch(() => {});
}

// Expose state to popup
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === "GET_STATE") {
    reply({
      active: state.active,
      eventCount: state.events.length,
      sessionId: state.sessionId,
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
