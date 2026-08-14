import "@testing-library/jest-dom/vitest";

// jsdom ships no `matchMedia`. Without it `captureDeviceInfo()` throws and every
// report in tests carries `deviceInfo: null` — which no real browser does.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
