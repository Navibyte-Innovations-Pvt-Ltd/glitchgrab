// Session state
interface CaptureState {
  active: boolean;
  startedAt: number | null;
  events: CaptureEvent[];
  sessionId: string | null;
  fromBridge: boolean; // started via GlitchRecord bridge (WS) vs manual hotkey
}

export interface CaptureEvent {
  type: "click" | "navigate" | "idle" | "input" | "select" | "keydown" | "scroll" | "copy" | "paste" | "note";
  t: number; // ms from capture start
  label?: string;
  tag?: string;
  url?: string;
  durationMs?: number;
  preview?: string; // input events: truncated field value
  meta?: Record<string, string>; // rich element descriptor (tag, role, icon, href, section, selector…)
  note?: string; // "note" events: "explain this" marker from the annotate hotkey
}

const state: CaptureState = {
  active: false,
  startedAt: null,
  events: [],
  sessionId: null,
  fromBridge: false,
};

// ── Debug log relay ───────────────────────────────────────────
// Background logs live in the service-worker console (hard to inspect).
// Mirror them into every page console (prefixed [GG-bg]) so they can be
// read alongside content-script logs from a single tab.
function log(...args: unknown[]) {
  console.log(...args);
  const text = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  // 1. Mirror into page consoles (readable via a watcher tab)
  try {
    chrome.tabs.query({ url: ["http://*/*", "https://*/*"] }, (tabs) => {
      for (const t of tabs) {
        if (t.id) chrome.tabs.sendMessage(t.id, { type: "GG_LOG", text }).catch(() => {});
      }
    });
  } catch { /* no tabs */ }
  // 2. Forward to GlitchRecord so it lands in the unified debug log file
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "log", text }));
    }
  } catch { /* ws not ready */ }
}

log("[GG] Background service worker started");

// ── Reinject content script into already-open tabs ────────────
// On install/update/SW-start, existing tabs still run the OLD (now orphaned)
// content script. Reinject the fresh one so those tabs can capture again.
// The content script's single-instance ping guard prevents double-registration
// on tabs that already have a live instance.
let reinjectedOnce = false;
function reinjectAllTabs() {
  if (reinjectedOnce) return; // run at most once per worker — avoid stacking instances
  reinjectedOnce = true;
  chrome.tabs.query({ url: ["http://*/*", "https://*/*"] }, (tabs) => {
    for (const tab of tabs) {
      if (!tab.id) continue;
      chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: false },
        files: ["content.js"],
      }).catch(() => { /* restricted page (chrome://, web store) — skip */ });
    }
  });
}
// Only on install/update — the manifest content_scripts already covers normal
// page loads, so reinjecting on every startup just stacks duplicate instances.
chrome.runtime.onInstalled.addListener(reinjectAllTabs);

// ── GlitchRecord WebSocket connection ────────────────────────
// GlitchRecord runs a WS server on 7337. Chrome ext connects for real-time sync.
const BRIDGE_WS = "ws://localhost:7337?role=chrome";
let ws: WebSocket | null = null;
let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;

function connectBridge() {
  if (ws && ws.readyState < 2) return; // already open/connecting
  try {
    ws = new WebSocket(BRIDGE_WS);

    ws.onopen = () => {
      log("[GG] Bridge connected");
      if (wsReconnectTimer) { clearTimeout(wsReconnectTimer); wsReconnectTimer = null; }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as { type: string; sessionId?: string; script?: string; issueUrl?: string };
        if (msg.type === "recording:start") {
          log("[GG] Bridge → recording:start");
          startCapture(msg.sessionId);
        } else if (msg.type === "recording:stop") {
          log("[GG] Bridge → recording:stop");
          stopCapture();
        } else if (msg.type === "script:ready") {
          state.sessionId = msg.sessionId ?? null;
          broadcastState();
        } else if (msg.type === "issue:created") {
          console.log("[GG] Issue created:", msg.issueUrl);
        }
      } catch { /* bad json */ }
    };

    ws.onclose = () => {
      log("[GG] Bridge disconnected — retry in 3s");
      ws = null;
      // GlitchRecord quit mid-recording — stop capture so extension doesn't record forever
      if (state.active && state.fromBridge) {
        log("[GG] Bridge closed while recording — stopping capture");
        stopCapture();
      }
      wsReconnectTimer = setTimeout(connectBridge, 3000);
    };

    ws.onerror = () => { ws?.close(); };
  } catch {
    wsReconnectTimer = setTimeout(connectBridge, 3000);
  }
}

connectBridge();

// Fallback signal polling (HTTP) used only when bridge is offline.
// Runs in background service worker — no "Extension context invalidated" risk.
const SIGNAL_URL = "http://localhost:3000/api/v1/capture-signal";
let lastSignalAt = 0;

setInterval(() => {
  if (ws && ws.readyState === WebSocket.OPEN) return; // bridge is primary
  fetch(SIGNAL_URL, { cache: "no-store" })
    .then(r => r.json())
    .then((data: { signal: string; signalAt: number }) => {
      if (data.signalAt <= lastSignalAt) return;
      lastSignalAt = data.signalAt;
      log("[GG] Signal changed →", data.signal);
      if (data.signal === "start" && !state.active) startCapture();
      else if (data.signal === "stop" && state.active) stopCapture();
    })
    .catch(() => {});
}, 600);

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

// Accept heartbeat ports from content scripts (they use these to detect context invalidation)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "gg-heartbeat") return;
  // Keep the port alive; content script's onDisconnect fires when SW dies or ext reloads
});

// Re-arm capture on tabs that finish loading DURING a recording. A full-page
// navigation or a new tab loads a fresh content script that missed the one-time
// CAPTURE_START broadcast — without this it would capture nothing.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!state.active) return;
  if (changeInfo.status !== "complete") return;
  chrome.tabs.sendMessage(tabId, { type: "CAPTURE_START" }).catch(() => {});
});

// Cross-instance dedup: if more than one content-script instance is alive in a
// tab (e.g. reinjection + manifest), the SAME DOM action arrives multiple times
// within a few ms. Collapse identical events that land inside a tiny window.
let ddKey = "";
let ddAt = 0;
const DEDUP_WINDOW_MS = 120;

// Receive events from content script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "CAPTURE_EVENT" && state.active && state.startedAt !== null) {
    const e = msg.event;
    const key = `${e.type}|${e.label ?? ""}|${e.url ?? ""}|${e.preview ?? ""}|${e.meta?.selector ?? ""}`;
    const now = Date.now();
    if (key === ddKey && now - ddAt < DEDUP_WINDOW_MS) return; // duplicate from another instance
    ddKey = key;
    ddAt = now;
    const event: CaptureEvent = {
      ...msg.event,
      t: now - state.startedAt,
    };
    state.events.push(event);
    const m = event.meta ?? {};
    const metaBits = [
      m.role && `role=${m.role}`,
      m.icon && `icon=${m.icon}`,
      m.href && `href=${m.href}`,
      m.section && `section=${m.section}`,
      m.id && `id=${m.id}`,
      event.preview && `value="${event.preview}"`,
    ].filter(Boolean).join(" ");
    log(`[GG] #${state.events.length} ${event.type} | ${event.label ?? event.url ?? ""} | ${metaBits} | t=${event.t}ms`);
    broadcastState();
    // Stream live to GlitchRecord so it shows the event feed in real time
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "event:live", event }));
    }
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

function startCapture(bridgeSessionId?: string) {
  state.active = true;
  state.startedAt = Date.now();
  state.events = [];
  state.sessionId = bridgeSessionId ?? null; // use bridge session if provided
  state.fromBridge = !!bridgeSessionId;
  setRecordingIcon(true);
  broadcastState();
  log("[GG] Capture started", bridgeSessionId ? `(bridge session: ${bridgeSessionId})` : "(manual)");
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
  log(`[GG] Capture stopped — ${state.events.length} events`);

  // Notify tabs to stop
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: "CAPTURE_STOP" }).catch(() => {});
      }
    }
  });

  if (state.events.length === 0) return;

  // Bridge session → send events to GlitchRecord over WS.
  // The bridge generates the script + creates the GitHub issue in the selected repo.
  if (state.fromBridge && state.sessionId && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "events:upload",
      sessionId: state.sessionId,
      events: state.events,
    }));
    log(`[GG] Sent ${state.events.length} events to bridge → ${state.sessionId}`);
    return;
  }

  // Manual (hotkey) session → grab Recordly meta + POST to web API
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
      log("[GG] Uploaded — session:", data.data.sessionId);
      // Broadcast sessionId back to signal endpoint so Recordly can read it
      fetch("http://localhost:3000/api/v1/capture-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal: "idle", sessionId: state.sessionId }),
      }).catch(() => {});
      broadcastState();
    }
  } catch (err) {
    log("[GG] Upload failed:", String(err));
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
  if (msg.type === "GET_EVENTS") {
    reply({ events: state.events });
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
