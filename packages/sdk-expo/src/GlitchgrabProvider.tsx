import { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import type { ReactNode } from "react";
import { GlitchgrabContext } from "./context";
import type { GlitchgrabConfig, GlitchgrabUser } from "./context";
import { BugReportSheet } from "./BugReportSheet";
import { captureCurrentScreen } from "./lib/capture";
import { useScreenshotDetection } from "./hooks/useScreenshotDetection";

export interface GlitchgrabProviderProps {
  /** Your Glitchgrab repo token (gg_…) */
  token: string;
  /** Override API base URL (default: https://glitchgrab.dev) */
  baseUrl?: string;
  /** User context for bug reports */
  user?: GlitchgrabUser | null;
  /** Enable 3-finger tap gesture to open report sheet (default: true) */
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
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      <View
        style={{ flex: 1 }}
        onStartShouldSetResponderCapture={(e) => {
          if (!threeFinger) return false;
          if (e.nativeEvent.touches.length >= 3) {
            if (tapTimeoutRef.current) return false;
            tapTimeoutRef.current = setTimeout(() => {
              tapTimeoutRef.current = null;
            }, 1000);
            void captureCurrentScreen().then((uri) => { openSheet(uri); });
          }
          return false;
        }}
      >
        {children}
      </View>
      <BugReportSheet
        visible={sheetVisible}
        screenshotUri={screenshotUri}
        config={config}
        onClose={handleClose}
      />
    </GlitchgrabContext.Provider>
  );
}
