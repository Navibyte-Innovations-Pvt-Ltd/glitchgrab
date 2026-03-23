import { useEffect, useRef, useState, useCallback } from "react";
import {
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  View,
  BackHandler,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  Image,
} from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";

const BASE_URL = "https://glitchgrab.dev";
const DARK_BG = "#09090b";
const PRIMARY = "#22d3ee";

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(BASE_URL);

  // Android back button — go back in WebView history
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });

    return () => handler.remove();
  }, [canGoBack]);

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      setCanGoBack(navState.canGoBack);
      setCurrentUrl(navState.url);
    },
    []
  );

  // Handle external links (GitHub OAuth, etc.) — open in system browser
  const handleShouldStartLoad = useCallback(
    (event: { url: string }) => {
      const url = event.url;

      // GitHub OAuth flow — open in system browser
      if (
        url.includes("github.com/login") ||
        url.includes("github.com/sessions")
      ) {
        WebBrowser.openBrowserAsync(url);
        return false;
      }

      // External links — open in system browser
      if (
        !url.startsWith(BASE_URL) &&
        !url.startsWith("about:") &&
        !url.includes("glitchgrab")
      ) {
        WebBrowser.openBrowserAsync(url);
        return false;
      }

      return true;
    },
    []
  );

  // Inject JS to fix viewport and theme for mobile
  const injectedJS = `
    (function() {
      // Set viewport meta for proper mobile rendering
      var meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        document.head.appendChild(meta);
      }
      meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';

      // Set theme-color for status bar
      var theme = document.querySelector('meta[name="theme-color"]');
      if (!theme) {
        theme = document.createElement('meta');
        theme.name = 'theme-color';
        document.head.appendChild(theme);
      }
      theme.content = '${DARK_BG}';

      // Hide scrollbar
      document.body.style.overscrollBehavior = 'none';
    })();
    true;
  `;

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={DARK_BG} />
        <View style={styles.errorContainer}>
          <Image
            source={require("./assets/icon.png")}
            style={styles.errorIcon}
          />
          <Text style={styles.errorTitle}>Can&apos;t connect</Text>
          <Text style={styles.errorText}>
            Check your internet connection and try again.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(false);
              setLoading(true);
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_BG} />

      {loading && (
        <View style={styles.loadingOverlay}>
          <Image
            source={require("./assets/icon.png")}
            style={styles.loadingIcon}
          />
          <ActivityIndicator size="small" color={PRIMARY} style={{ marginTop: 16 }} />
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          if (nativeEvent.statusCode >= 500) {
            setError(true);
          }
        }}
        injectedJavaScript={injectedJS}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        allowsBackForwardNavigationGestures
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        cacheEnabled
        pullToRefreshEnabled
        overScrollMode="never"
        decelerationRate="normal"
        contentMode="mobile"
        setSupportMultipleWindows={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  webview: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DARK_BG,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 16,
  },
  errorTitle: {
    color: "#fafafa",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  errorText: {
    color: "#a1a1aa",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: DARK_BG,
    fontSize: 14,
    fontWeight: "600",
  },
});
