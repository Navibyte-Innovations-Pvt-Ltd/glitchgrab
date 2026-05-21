import { useEffect, useRef } from "react";

// Dynamically imported so expo-media-library is a true peer dep —
// the SDK won't crash if it's absent but detection simply won't fire.
export function useScreenshotDetection(
  onScreenshot: (uri: string) => void,
  enabled: boolean
): void {
  const lastCheck = useRef(Date.now());
  const callbackRef = useRef(onScreenshot);
  callbackRef.current = onScreenshot;

  useEffect(() => {
    if (!enabled) return;

    let cleanup: (() => void) | undefined;

    void (async () => {
      try {
        const MediaLibrary = await import("expo-media-library");

        await MediaLibrary.requestPermissionsAsync();

        const subscription = MediaLibrary.addListener(() => {
          void (async () => {
            const now = Date.now();
            const since = lastCheck.current;
            lastCheck.current = now;

            const { assets } = await MediaLibrary.getAssetsAsync({
              mediaType: MediaLibrary.MediaType.photo,
              sortBy: [[MediaLibrary.SortBy.creationTime, false]],
              first: 3,
            });

            const match = assets.find((a) => {
              const createdMs = a.creationTime * 1000;
              const isRecent = createdMs > since - 500;
              const name = a.filename.toLowerCase();
              return (
                isRecent &&
                (name.includes("screenshot") ||
                  name.startsWith("screen_") ||
                  name.startsWith("screen-") ||
                  /screen\d/.test(name))
              );
            });

            if (match) {
              const info = await MediaLibrary.getAssetInfoAsync(match);
              const uri = info.localUri ?? info.uri;
              callbackRef.current(uri);
            }
          })();
        });

        cleanup = () => { subscription.remove(); };
      } catch {
        // expo-media-library not installed or permission denied — silent
      }
    })();

    return () => { cleanup?.(); };
  }, [enabled]);
}
