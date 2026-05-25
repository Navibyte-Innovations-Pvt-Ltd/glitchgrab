import { useCallback, useEffect, useRef, useState } from "react";
import { useColorScheme, View } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as MediaLibrary from "expo-media-library";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TamaguiProvider, type TamaguiProviderProps } from "tamagui";
import { captureScreen } from "react-native-view-shot";
import tamaguiConfig from "../tamagui.config";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { BugReportSheet } from "@/components/BugReportSheet";

void SplashScreen.preventAutoHideAsync();

// rc.7 vs rc.42 @tamagui/web version mismatch causes structural type incompatibility
const tamaguiConfigTyped = tamaguiConfig as unknown as TamaguiProviderProps["config"];

// Distance (px) the 3 fingers must travel to count as a drag, not a tap.
const THREE_FINGER_DRAG_THRESHOLD = 60;

function averageTouch(touches: { pageX: number; pageY: number }[]) {
  const sum = touches.reduce(
    (acc, t) => ({ x: acc.x + t.pageX, y: acc.y + t.pageY }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / touches.length, y: sum.y / touches.length };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 2 * 60 * 1000, retry: 2 },
  },
});

function RootLayoutNav() {
  const { isLoading, isAuthenticated } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const lastScreenshotCheck = useRef(Date.now());
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isLoading) void SplashScreen.hideAsync();
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      void router.replace("/(auth)/login");
    }
  }, [isLoading, isAuthenticated]);

  // Screenshot detection via media library
  useEffect(() => {
    if (!isAuthenticated) return;

    void MediaLibrary.requestPermissionsAsync();

    const subscription = MediaLibrary.addListener(() => {
      void (async () => {
        const now = Date.now();
        const since = lastScreenshotCheck.current;
        lastScreenshotCheck.current = now;

        const { assets } = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.photo,
          sortBy: [[MediaLibrary.SortBy.creationTime, false]],
          first: 3,
        });

        const screenshot = assets.find((a) => {
          const createdMs = a.creationTime * 1000;
          const isRecent = createdMs > since - 500;
          const name = a.filename.toLowerCase();
          return isRecent && (
            name.includes("screenshot") ||
            name.startsWith("screen_") ||
            name.startsWith("screen-") ||
            /screen\d/.test(name)
          );
        });

        if (screenshot) {
          const info = await MediaLibrary.getAssetInfoAsync(screenshot);
          const uri = info.localUri ?? info.uri;
          setScreenshotUri(uri);
          setSheetOpen(true);
        }
      })();
    });

    return () => { subscription.remove(); };
  }, [isAuthenticated]);

  const openReportWithCapture = useCallback(() => {
    void (async () => {
      try {
        const uri = await captureScreen({ format: "jpg", quality: 0.8 });
        setScreenshotUri(uri);
      } catch {
        setScreenshotUri(null);
      }
      setSheetOpen(true);
    })();
  }, []);

  if (isLoading) return <LoadingSpinner message="Loading..." />;

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={(e) => {
        // Record the drag origin once the 3rd finger lands.
        dragStartRef.current =
          e.nativeEvent.touches.length >= 3
            ? averageTouch(e.nativeEvent.touches)
            : null;
        return false;
      }}
      onMoveShouldSetResponderCapture={(e) => {
        const touches = e.nativeEvent.touches;
        if (touches.length < 3 || !dragStartRef.current) return false;
        const current = averageTouch(touches);
        const dx = current.x - dragStartRef.current.x;
        const dy = current.y - dragStartRef.current.y;
        if (Math.hypot(dx, dy) >= THREE_FINGER_DRAG_THRESHOLD) {
          // Debounce: ignore repeat within 1s
          if (tapTimeoutRef.current) return false;
          tapTimeoutRef.current = setTimeout(() => {
            tapTimeoutRef.current = null;
          }, 1000);
          dragStartRef.current = null;
          openReportWithCapture();
        }
        return false;
      }}
    >
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="report/[id]" options={{ presentation: "modal" }} />
      </Stack>
      <BugReportSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setScreenshotUri(null); }}
        screenshotUri={screenshotUri}
      />
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <TamaguiProvider config={tamaguiConfigTyped} defaultTheme={colorScheme === "light" ? "light" : "dark"}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </QueryClientProvider>
    </TamaguiProvider>
  );
}
