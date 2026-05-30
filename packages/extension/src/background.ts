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

async function setRecordingIcon(recording: boolean) {
  const sizes = [16, 32, 48, 128];
  const imageData: Record<number, ImageData> = {};

  for (const size of sizes) {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d")!;

    // Draw original icon
    const res = await fetch(chrome.runtime.getURL(`icon${size}.png`));
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    ctx.drawImage(bitmap, 0, 0, size, size);
    bitmap.close();

    if (recording) {
      // Small red dot — bottom-right corner, 22% of icon size
      const r = Math.max(2, Math.round(size * 0.22));
      const x = size - r - 1;
      const y = size - r - 1;
      // Dark border so dot pops on any background
      ctx.beginPath();
      ctx.arc(x, y, r + 1, 0, Math.PI * 2);
      ctx.fillStyle = "#000";
      ctx.fill();
      // Red fill
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
    }

    imageData[size] = ctx.getImageData(0, 0, size, size);
  }

  chrome.action.setIcon({ imageData });
}

function startCapture() {
  state.active = true;
  state.startedAt = Date.now();
  state.events = [];
  state.sessionId = null;
  setRecordingIcon(true);
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
  setRecordingIcon(false);
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
