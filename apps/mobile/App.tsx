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
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";

const BASE_URL = __DEV__
  ? "http://192.168.1.3:3000"
  : "https://glitchgrab.dev";

const DARK_BG = "#09090b";
const PRIMARY = "#22d3ee";

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(BASE_URL);

  // Android back button
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

  // Handle deep links (callback from browser OAuth)
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      // When GitHub OAuth completes, browser redirects to our callback URL
      // The WebView needs to load the callback URL to complete auth
      if (event.url.includes("/api/auth/callback")) {
        const callbackUrl = event.url.replace("glitchgrab://", BASE_URL + "/");
        webViewRef.current?.injectJavaScript(
          `window.location.href = "${callbackUrl}"; true;`
        );
      }
    };

    const sub = Linking.addEventListener("url", handleDeepLink);
    return () => sub.remove();
  }, []);

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      setCanGoBack(navState.canGoBack);
      setCurrentUrl(navState.url);
    },
    []
  );

  const handleShouldStartLoad = useCallback(
    (event: { url: string }) => {
      const url = event.url;

      // NextAuth sign-in redirect to GitHub — open in system browser
      if (
        url.includes("github.com/login/oauth") ||
        url.includes("github.com/login?") ||
        url.includes("github.com/sessions")
      ) {
        // Open GitHub OAuth in system browser
        // After auth, GitHub redirects to our callback URL
        // which the system browser handles, then we capture it
        WebBrowser.openAuthSessionAsync(url, "glitchgrab://").then(
          (result) => {
            if (result.type === "success" && result.url) {
              // Convert the deep link URL back to a web URL
              const webUrl = result.url.replace(
                "glitchgrab://",
                BASE_URL + "/"
              );
              webViewRef.current?.injectJavaScript(
                `window.location.href = "${webUrl}"; true;`
              );
            } else {
              // User cancelled — reload login page
              webViewRef.current?.injectJavaScript(
                `window.location.href = "${BASE_URL}/login"; true;`
              );
            }
          }
        );
        return false;
      }

      // NextAuth API auth routes — let WebView handle them
      if (url.includes("/api/auth/")) {
        return true;
      }

      // External links — open in system browser
      if (
        !url.startsWith(BASE_URL) &&
        !url.startsWith("about:") &&
        !url.includes("localhost")
      ) {
        WebBrowser.openBrowserAsync(url);
        return false;
      }

      return true;
    },
    []
  );

  const injectedJS = `
    (function() {
      var meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        document.head.appendChild(meta);
      }
      meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';

      var theme = document.querySelector('meta[name="theme-color"]');
      if (!theme) {
        theme = document.createElement('meta');
        theme.name = 'theme-color';
        document.head.appendChild(theme);
      }
      theme.content = '${DARK_BG}';

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
          <ActivityIndicator
            size="small"
            color={PRIMARY}
            style={{ marginTop: 16 }}
          />
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
