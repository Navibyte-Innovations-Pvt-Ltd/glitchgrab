// Glitchgrab Script Generator — Recordly Extension
// Fetches click events from a Glitchgrab capture session, calls Claude
// via the Glitchgrab API, then copies the narration script to clipboard.

import type { RecordlyExtensionAPI } from "./types";

const API_BASE = "http://localhost:3000/api/v1";

// Settings field IDs
const FIELD_SESSION_ID = "sessionId";
const FIELD_GENERATE = "generate";
const FIELD_STATUS = "status";

export function activate(api: RecordlyExtensionAPI) {
  let generating = false;

  api.registerSettingsPanel({
    id: "glitchgrab-script",
    label: "Script Generator",
    icon: "Sparkle",
    fields: [
      {
        id: FIELD_SESSION_ID,
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
        defaultValue: "Paste session ID from Glitchgrab extension, then toggle Generate.",
      },
    ],
  });

  api.onSettingChange(async (fieldId, value) => {
    if (fieldId !== FIELD_GENERATE || !value || generating) return;

    const sessionId = String(api.getSetting(FIELD_SESSION_ID) ?? "").trim();
    if (!sessionId) {
      api.setSetting(FIELD_STATUS, "No session ID entered.");
      api.setSetting(FIELD_GENERATE, false);
      return;
    }

    generating = true;
    api.setSetting(FIELD_STATUS, "Generating...");
    api.log("Glitchgrab: generating script for session", sessionId);

    try {
      // Trigger server-side Claude generation
      const genRes = await fetch(`${API_BASE}/capture-sessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!genRes.ok) {
        const err = await genRes.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? `HTTP ${genRes.status}`
        );
      }

      const genData = await genRes.json() as {
        success: boolean;
        data: { script: string };
        error?: string;
      };

      if (!genData.success) throw new Error(genData.error ?? "Generation failed");

      const script = genData.data.script;

      // Copy to clipboard
      await navigator.clipboard.writeText(script);

      const wordCount = script.split(/\s+/).filter(Boolean).length;
      api.setSetting(FIELD_STATUS, `Done — ${wordCount} words copied to clipboard`);
      api.log("Glitchgrab: script copied to clipboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      api.setSetting(FIELD_STATUS, `Error: ${msg}`);
      api.log("Glitchgrab error:", msg);
    } finally {
      generating = false;
      api.setSetting(FIELD_GENERATE, false);
    }
  });
}

export function deactivate() {}
