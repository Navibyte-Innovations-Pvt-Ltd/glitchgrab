import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { GlitchgrabContext } from "./context";
import type { GlitchgrabConfig, GlitchgrabUser } from "./context";
import { BugReportSheet } from "./BugReportSheet";
import { ThreeFingerArea } from "./ThreeFingerArea";
import { useScreenshotDetection } from "./hooks/useScreenshotDetection";

export interface GlitchgrabProviderProps {
  /** Your Glitchgrab repo token (gg_…) */
  token: string;
  /** Override API base URL (default: https://glitchgrab.dev) */
  baseUrl?: string;
  /** User context for bug reports */
  user?: GlitchgrabUser | null;
  /** Enable 3-finger drag gesture to open report sheet (default: true) */
  threeFinger?: boolean;
  /** Detect native screenshots and offer to file a report (default: true) */
  screenshotDetection?: boolean;
  children: ReactNode;
}

export function GlitchgrabProvider({
  token,
  baseUrl = "https://glitchgrab.dev",
  user = undefined,
  threeFinger = true,
  screenshotDetection = true,
  children,
}: GlitchgrabProviderProps) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);

  const openSheet = useCallback((uri?: string | null) => {
    setScreenshotUri(uri ?? null);
    setSheetVisible(true);
  }, []);

  const handleClose = useCallback(() => {
    setSheetVisible(false);
    setScreenshotUri(null);
  }, []);

  // Screenshot detection
  useScreenshotDetection(
    useCallback((uri: string) => { openSheet(uri); }, [openSheet]),
    screenshotDetection
  );

  const config: GlitchgrabConfig = {
    token,
    baseUrl,
    user: user ?? null,
    threeFinger,
    screenshotDetection,
  };

  return (
    <GlitchgrabContext.Provider value={{ config, openSheet }}>
      <ThreeFingerArea enabled={threeFinger} onTrigger={openSheet}>
        {children}
      </ThreeFingerArea>
      <BugReportSheet
        visible={sheetVisible}
        screenshotUri={screenshotUri}
        config={config}
        onClose={handleClose}
      />
    </GlitchgrabContext.Provider>
  );
}
