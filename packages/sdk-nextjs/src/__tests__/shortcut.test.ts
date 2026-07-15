import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GLITCHGRAB_SHORTCUT,
  GLITCHGRAB_SHORTCUT_MAC,
  getShortcutLabel,
  matchesShortcut,
} from "../shortcut";

/** Build a KeyboardEvent-like object with only the fields matchesShortcut reads. */
function key(
  k: string,
  mods: { meta?: boolean; ctrl?: boolean; shift?: boolean } = {},
): KeyboardEvent {
  return {
    key: k,
    metaKey: !!mods.meta,
    ctrlKey: !!mods.ctrl,
    shiftKey: !!mods.shift,
  } as KeyboardEvent;
}

describe("matchesShortcut", () => {
  it("matches Cmd+Shift+G", () => {
    expect(matchesShortcut(key("g", { meta: true, shift: true }))).toBe(true);
  });

  it("matches Ctrl+Shift+G", () => {
    expect(matchesShortcut(key("g", { ctrl: true, shift: true }))).toBe(true);
  });

  it("matches regardless of key case (caps lock on)", () => {
    expect(matchesShortcut(key("G", { ctrl: true, shift: true }))).toBe(true);
  });

  it("does not match without shift", () => {
    expect(matchesShortcut(key("g", { ctrl: true }))).toBe(false);
  });

  it("does not match without a meta/ctrl modifier", () => {
    expect(matchesShortcut(key("g", { shift: true }))).toBe(false);
  });

  it("does not match a different key", () => {
    expect(matchesShortcut(key("h", { ctrl: true, shift: true }))).toBe(false);
  });
});

describe("getShortcutLabel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the Mac label on a Mac platform", () => {
    vi.stubGlobal("navigator", { platform: "MacIntel", userAgent: "" });
    expect(getShortcutLabel()).toBe(GLITCHGRAB_SHORTCUT_MAC);
  });

  it("returns the Ctrl label elsewhere", () => {
    vi.stubGlobal("navigator", { platform: "Win32", userAgent: "" });
    expect(getShortcutLabel()).toBe(GLITCHGRAB_SHORTCUT);
  });

  it("falls back to the Ctrl label when navigator is unavailable (SSR)", () => {
    vi.stubGlobal("navigator", undefined);
    expect(getShortcutLabel()).toBe(GLITCHGRAB_SHORTCUT);
  });
});
