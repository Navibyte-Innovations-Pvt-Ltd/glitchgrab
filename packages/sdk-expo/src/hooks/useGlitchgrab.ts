import { useGlitchgrabContext } from "../context";
import { captureCurrentScreen } from "../lib/capture";

export interface UseGlitchgrabReturn {
  /** Open the bug report sheet, optionally with a pre-captured screenshot */
  reportBug: (options?: { screenshotUri?: string }) => void;
  /** Capture the current screen then open the report sheet */
  reportWithScreenshot: () => Promise<void>;
}

export function useGlitchgrab(): UseGlitchgrabReturn {
  const { openSheet } = useGlitchgrabContext();

  function reportBug(options?: { screenshotUri?: string }) {
    openSheet(options?.screenshotUri ?? null);
  }

  async function reportWithScreenshot() {
    const uri = await captureCurrentScreen();
    openSheet(uri);
  }

  return { reportBug, reportWithScreenshot };
}
