import type { RecordlyExtensionAPI } from "./types";

const API_BASE = "http://localhost:3000/api/v1";
const SIGNAL_URL = `${API_BASE}/capture-signal`;

const FIELD_RECORD  = "record";
const FIELD_SESSION = "sessionId";
const FIELD_GENERATE = "generate";
const FIELD_STATUS  = "status";

async function postSignal(signal: "start" | "stop" | "idle") {
  await fetch(SIGNAL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signal }),
  }).catch(() => {});
}

export function activate(api: RecordlyExtensionAPI) {
  let generating = false;

  api.registerSettingsPanel({
    id: "glitchgrab-script",
    label: "Script Generator",
    icon: "Sparkle",
    fields: [
      {
        id: FIELD_RECORD,
        label: "Start Capture",
        type: "toggle",
        defaultValue: false,
      },
      {
        id: FIELD_SESSION,
        label: "Session ID",
        type: "text",
        defaultValue: "",
      },
      {
        id: FIELD_GENERATE,
        label: "Generate Script",
        type: "toggle",
        defaultValue: false,
      },
      {
        id: FIELD_STATUS,
        label: "Status",
        type: "text",
        defaultValue: "Toggle 'Start Capture' before recording. Chrome extension auto-starts.",
      },
    ],
  });

  // "Start Capture" toggle → signal Chrome extension
  api.onSettingChange(async (fieldId, value) => {
    if (fieldId === FIELD_RECORD) {
      if (value) {
        await postSignal("start");
        api.setSetting(FIELD_STATUS, "Capturing... Chrome extension is recording clicks.");
        api.log("Glitchgrab: sent START signal");
      } else {
        await postSignal("stop");
        api.setSetting(FIELD_STATUS, "Stopped. Check Chrome extension for session ID.");
        api.log("Glitchgrab: sent STOP signal");
      }
    }

    // Generate script
    if (fieldId === FIELD_GENERATE && value && !generating) {
      const sessionId = String(api.getSetting(FIELD_SESSION) ?? "").trim();
      if (!sessionId) {
        api.setSetting(FIELD_STATUS, "Paste session ID first.");
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
        api.log("Glitchgrab: script copied");
      } catch (err) {
        api.setSetting(FIELD_STATUS, `Error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        generating = false;
        api.setSetting(FIELD_GENERATE, false);
      }
    }
  });

  // export:complete → auto-stop capture
  api.on("export:complete", async () => {
    const isRecording = api.getSetting(FIELD_RECORD);
    if (isRecording) {
      api.setSetting(FIELD_RECORD, false);
      await postSignal("stop");
      api.setSetting(FIELD_STATUS, "Export done — capture stopped. Check Chrome for session ID.");
      api.log("Glitchgrab: auto-stopped on export:complete");
    }
  });
}

export function deactivate() {
  postSignal("idle");
}
