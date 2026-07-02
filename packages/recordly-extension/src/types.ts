// Minimal GlitchRecordExtensionAPI type surface used by this extension
// Full type reference: https://github.com/webadderallorg/GlitchRecord/blob/main/electron/extensions/

export interface SettingsField {
  id: string;
  label: string;
  type: "toggle" | "slider" | "select" | "color" | "text";
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: string }>;
}

export interface SettingsPanel {
  id: string;
  label: string;
  icon?: string;
  parentSection?: string;
  fields: SettingsField[];
}

export interface GlitchRecordExtensionAPI {
  log(message: string, ...args: unknown[]): void;
  on(event: string, handler: (data?: unknown) => void): () => void;
  getSetting(id: string): unknown;
  setSetting(id: string, value: unknown): void;
  onSettingChange(callback: (settingId: string, value: unknown) => void): () => void;
  getAllSettings(): Record<string, unknown>;
  registerSettingsPanel(panel: SettingsPanel): () => void;
  getVideoInfo(): { width: number; height: number; durationMs: number; fps: number } | null;
  getPlaybackState(): { currentTimeMs: number; durationMs: number; isPlaying: boolean } | null;
  getKeystrokesInRange(startMs: number, endMs: number): Array<{ timeMs: number; key: string }>;
}
