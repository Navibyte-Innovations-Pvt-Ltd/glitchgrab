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
  KeyboardAvoidingView,
} from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import { BASE_URL } from "../api";

const DARK_BG = "#09090b";
const PRIMARY = "#22d3ee";

interface WebViewScreenProps {
  sessionToken: string;
  onLogout: () => void;
}

export default function WebViewScreen({
  sessionToken,
  onLogout,
}: WebViewScreenProps) {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      setCanGoBack(navState.canGoBack);

      // Detect if the WebView navigated to the login page (session expired)
      if (
        navState.url.includes("/login") &&
        !navState.url.includes("/api/auth")
      ) {
        onLogout();
      }
    },
    [onLogout]
  );

  const handleShouldStartLoad = useCallback((event: { url: string }) => {
    const url = event.url;

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
  }, []);

  // Runs BEFORE page content loads — sets cookie and viewport
  const injectedBeforeLoad = `
    (function() {
      document.cookie = "authjs.session-token=${sessionToken}; path=/; max-age=2592000; SameSite=Lax";
      document.cookie = "__Secure-authjs.session-token=${sessionToken}; path=/; max-age=2592000; SameSite=Lax; Secure";

      // Set viewport immediately
      var meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
      document.head.appendChild(meta);
    })();
    true;
  `;

  // Runs AFTER page loads — styles and event handlers
  const injectedAfterLoad = `
    (function() {
      // Remove duplicate viewport metas, keep ours
      var metas = document.querySelectorAll('meta[name="viewport"]');
      for (var i = 1; i < metas.length; i++) metas[i].remove();

      // Force first viewport to our settings
      if (metas[0]) metas[0].content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

      // Force 16px on inputs to prevent iOS zoom
      var s = document.createElement('style');
      s.textContent = 'input,textarea,select{font-size:16px!important}';
      document.head.appendChild(s);

      document.body.style.overscrollBehavior = 'none';
      document.addEventListener('gesturestart', function(e) { e.preventDefault(); });
    })();
    true;
  `;

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={DARK_BG} />
        <View style={styles.errorContainer}>
          <Image
            source={require("../../assets/icon.png")}
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={DARK_BG} />

        {loading && (
          <View style={styles.loadingOverlay}>
            <Image
              source={require("../../assets/icon.png")}
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
          source={{
            uri: `${BASE_URL}/dashboard`,
            headers: {
              Cookie: `authjs.session-token=${sessionToken}`,
            },
          }}
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
          injectedJavaScriptBeforeContentLoaded={injectedBeforeLoad}
          injectedJavaScript={injectedAfterLoad}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          allowsBackForwardNavigationGestures
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          cacheEnabled
          pullToRefreshEnabled={false}
          overScrollMode="never"
          decelerationRate="normal"
          contentMode="mobile"
          setSupportMultipleWindows={false}
          scalesPageToFit={false}
          automaticallyAdjustContentInsets={false}
          automaticallyAdjustsScrollIndicatorInsets={false}
          keyboardDisplayRequiresUserAction={false}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
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
