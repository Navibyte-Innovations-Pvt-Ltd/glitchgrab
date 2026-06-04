import type { RecordlyExtensionAPI } from "./types";

const API_BASE = "http://localhost:3000/api/v1";
const SIGNAL_URL = `${API_BASE}/capture-signal`;

const FIELD_RECORD   = "record";
const FIELD_SESSION  = "sessionId";
const FIELD_GENERATE = "generate";
const FIELD_STATUS   = "status";

interface ClipRange { startMs: number; endMs: number }

// Collect cut regions as user edits
const cutRegions: ClipRange[] = [];
let apiReachable = true;

async function postSignal(body: Record<string, unknown>): Promise<boolean> {
  try {
    await fetch(SIGNAL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    apiReachable = true;
    return true;
  } catch {
    apiReachable = false;
    return false;
  }
}

function buildKeptRanges(cuts: ClipRange[], totalMs: number): ClipRange[] {
  if (cuts.length === 0) return [{ startMs: 0, endMs: totalMs }];
  const sorted = [...cuts].sort((a, b) => a.startMs - b.startMs);
  const kept: ClipRange[] = [];
  let cursor = 0;
  for (const cut of sorted) {
    if (cut.startMs > cursor) kept.push({ startMs: cursor, endMs: cut.startMs });
    cursor = Math.max(cursor, cut.endMs);
  }
  if (cursor < totalMs) kept.push({ startMs: cursor, endMs: totalMs });
  return kept;
}

export function activate(api: RecordlyExtensionAPI) {
  let generating = false;

  api.registerSettingsPanel({
    id: "glitchgrab-script",
    label: "Script Generator",
    icon: "Sparkle",
    fields: [
      { id: FIELD_RECORD,   label: "Start Capture", type: "toggle", defaultValue: false },
      { id: FIELD_SESSION,  label: "Session ID",    type: "text",   defaultValue: "" },
      { id: FIELD_GENERATE, label: "Generate Script", type: "toggle", defaultValue: false },
      {
        id: FIELD_STATUS,
        label: "Status",
        type: "text",
        defaultValue: "Toggle 'Start Capture' before recording.",
      },
    ],
  });

  // ── Start / Stop toggle ──────────────────────────────────────
  api.onSettingChange(async (fieldId, value) => {
    if (fieldId === FIELD_RECORD) {
      if (value) {
        cutRegions.length = 0; // reset cuts for new session
        const ok = await postSignal({ signal: "start" });
        api.setSetting(
          FIELD_STATUS,
          ok
            ? "Capturing — Chrome extension started automatically."
            : "API offline — start Chrome capture manually with Ctrl+Shift+G."
        );
        api.log("Glitchgrab: START signal", ok ? "sent" : "FAILED (API offline)");
      } else {
        await sendStopWithMeta(api);
      }
    }

    // ── Generate script ──────────────────────────────────────
    if (fieldId === FIELD_GENERATE && value && !generating) {
      // Try to get sessionId from signal endpoint first, then fall back to field
      let sessionId = String(api.getSetting(FIELD_SESSION) ?? "").trim();
      if (!sessionId) {
        try {
          const res = await fetch(SIGNAL_URL, { cache: "no-store" });
          const data = await res.json() as { sessionId?: string };
          if (data.sessionId) {
            sessionId = data.sessionId;
            api.setSetting(FIELD_SESSION, sessionId);
          }
        } catch { /* offline */ }
      }
      if (!sessionId) {
        api.setSetting(FIELD_STATUS, "No session ID. Check Chrome extension popup.");
        api.setSetting(FIELD_GENERATE, false);
        return;
      }

      generating = true;
      api.setSetting(FIELD_STATUS, "Generating script...");
      try {
        const res = await fetch(`${API_BASE}/capture-sessions/${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json() as { success: boolean; data?: { script: string }; error?: string };
        if (!data.success || !data.data?.script) throw new Error(data.error ?? "Failed");

        await navigator.clipboard.writeText(data.data.script);
        const words = data.data.script.split(/\s+/).filter(Boolean).length;
        api.setSetting(FIELD_STATUS, `Done — ${words} words copied to clipboard`);
      } catch (err) {
        api.setSetting(FIELD_STATUS, `Error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        generating = false;
        api.setSetting(FIELD_GENERATE, false);
      }
    }
  });

  // ── Collect cut regions as user edits ────────────────────────
  api.on("timeline:region-added", (data) => {
    const d = data as { startMs?: number; endMs?: number } | undefined;
    if (d?.startMs !== undefined && d?.endMs !== undefined) {
      cutRegions.push({ startMs: d.startMs, endMs: d.endMs });
      api.log(`Glitchgrab: cut recorded ${d.startMs}-${d.endMs}ms`);
    }
  });

  api.on("timeline:region-removed", (data) => {
    const d = data as { startMs?: number; endMs?: number } | undefined;
    if (d?.startMs !== undefined) {
      const idx = cutRegions.findIndex(r => r.startMs === d.startMs);
      if (idx !== -1) cutRegions.splice(idx, 1);
    }
  });

  // ── Export complete → auto-stop with full metadata ───────────
  api.on("export:complete", async () => {
    if (!api.getSetting(FIELD_RECORD)) return;
    api.setSetting(FIELD_RECORD, false);
    await sendStopWithMeta(api);
    api.setSetting(FIELD_STATUS, "Export done — capture stopped. Toggle Generate Script.");
  });
}

async function sendStopWithMeta(api: RecordlyExtensionAPI) {
  const videoInfo = api.getVideoInfo();
  const originalDurationMs = videoInfo?.durationMs ?? 0;

  const keptRanges = buildKeptRanges(cutRegions, originalDurationMs);
  const finalDurationMs = keptRanges.reduce((sum, r) => sum + (r.endMs - r.startMs), 0);

  const meta = {
    originalDurationMs,
    finalDurationMs,
    keptRanges,
    cutRanges: [...cutRegions],
    exportStartedAt: Date.now(),
  };

  api.log("Glitchgrab: stop with meta", JSON.stringify(meta));

  const ok = await postSignal({ signal: "stop", meta });
  api.setSetting(
    FIELD_STATUS,
    ok
      ? `Stopped — ${cutRegions.length} cuts tracked. Check Chrome for session ID.`
      : `Stopped (API offline) — start Chrome manually. ${cutRegions.length} cuts logged.`
  );
}

export function deactivate() {
  postSignal({ signal: "idle" });
}
