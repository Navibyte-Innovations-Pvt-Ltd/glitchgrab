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

console.log("[GG] Background service worker started");

// Signal polling — background does the fetch (bypasses HTTPS mixed-content blocks)
const SIGNAL_URL = "http://localhost:3000/api/v1/capture-signal";
let lastSignalAt = 0;

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
    console.log(`[GG] #${state.events.length} ${event.type} | ${event.label ?? event.url ?? ""} | t=${event.t}ms`);
    broadcastState();
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
  console.log("[GG] Capture started");
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
  console.log(`[GG] Capture stopped — ${state.events.length} events`);

  // Notify tabs to stop
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: "CAPTURE_STOP" }).catch(() => {});
      }
    }
  });

  if (state.events.length === 0) return;

  // Grab recording metadata from signal endpoint (Recordly cuts/clips)
  let meta: unknown = null;
  try {
    const sigRes = await fetch("http://localhost:3000/api/v1/capture-signal", { cache: "no-store" });
    const sigData = await sigRes.json() as { meta?: unknown };
    meta = sigData.meta ?? null;
    if (meta) console.log("[GG] Got recording meta from Recordly");
  } catch { /* server not running */ }

  // POST events + metadata to API
  try {
    const res = await fetch("http://localhost:3000/api/v1/capture-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: state.events, meta }),
    });
    const data = await res.json() as { success: boolean; data?: { sessionId: string } };
    if (data.success && data.data?.sessionId) {
      state.sessionId = data.data.sessionId;
      console.log("[GG] Uploaded — session:", data.data.sessionId);
      // Broadcast sessionId back to signal endpoint so Recordly can read it
      fetch("http://localhost:3000/api/v1/capture-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal: "idle", sessionId: state.sessionId }),
      }).catch(() => {});
      broadcastState();
    }
  } catch (err) {
    console.error("[GG] Upload failed:", err);
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
  if (msg.type === "POLL_SIGNAL") {
    // Deduplicate — only one fetch per 500ms regardless of how many tabs send POLL_SIGNAL
    const now = Date.now();
    if (now - (state as unknown as { lastPollAt?: number }).lastPollAt! < 500) return false;
    (state as unknown as { lastPollAt: number }).lastPollAt = now;

    fetch(SIGNAL_URL, { cache: "no-store" })
      .then(r => r.json())
      .then((data: { signal: string; signalAt: number }) => {
        if (data.signalAt <= lastSignalAt) return;
        lastSignalAt = data.signalAt;
        console.log("[GG] Signal changed →", data.signal);
        if (data.signal === "start" && !state.active) {
          console.log("[GG] Auto-start from Recordly signal");
          startCapture();
        } else if (data.signal === "stop" && state.active) {
          console.log("[GG] Auto-stop from Recordly signal");
          stopCapture();
        }
      })
      .catch(() => {});
    return false;
  }
  if (msg.type === "SIGNAL_START" && !state.active) {
    startCapture();
    return false;
  }
  if (msg.type === "SIGNAL_STOP" && state.active) {
    stopCapture();
    return false;
  }
  return false;
});
