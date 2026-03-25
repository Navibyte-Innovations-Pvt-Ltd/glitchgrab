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
  sharedImageUri?: string | null;
  onSharedImageHandled?: () => void;
  processingShare?: boolean;
}

export default function WebViewScreen({
  sessionToken,
  onLogout,
  sharedImageUri,
  onSharedImageHandled,
  processingShare,
}: WebViewScreenProps) {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const hasLoadedOnce = useRef(false);
  const loginRedirectCount = useRef(0);

  // Store pending shared image ref
  const pendingImageRef = useRef<string | null>(null);

  // When shared image arrives, navigate to dashboard
  useEffect(() => {
    if (!sharedImageUri || !webViewRef.current || loading) return;
    pendingImageRef.current = sharedImageUri;

    // Navigate to dashboard (chat page)
    webViewRef.current.injectJavaScript(`
      window.location.href = '/dashboard';
      true;
    `);
  }, [sharedImageUri, loading]);

  // Inject the image after dashboard loads
  const handleLoadEnd = useCallback(() => {
    setLoading(false);

    if (!pendingImageRef.current || !webViewRef.current) return;
    const imageUri = pendingImageRef.current;

    // Wait for React to render the chat
    setTimeout(() => {
      const js = `
        (function() {
          try {
            var base64 = "${imageUri.replace(/"/g, '\\"')}";
            var parts = base64.split(',');
            var byteString = atob(parts[1]);
            var mimeString = parts[0].split(':')[1].split(';')[0];
            var ab = new ArrayBuffer(byteString.length);
            var ia = new Uint8Array(ab);
            for (var i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            var blob = new Blob([ab], { type: mimeString });
            var file = new File([blob], 'shared_screenshot.jpg', { type: mimeString });

            var dt = new DataTransfer();
            dt.items.add(file);

            var textarea = document.querySelector('textarea');
            if (textarea) {
              var pasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: dt
              });
              textarea.dispatchEvent(pasteEvent);
              textarea.focus();
            }
          } catch(e) {
            console.error('Share handler error:', e);
          }
        })();
        true;
      `;
      webViewRef.current?.injectJavaScript(js);
      pendingImageRef.current = null;
      if (onSharedImageHandled) onSharedImageHandled();
    }, 2000);
  }, [onSharedImageHandled]);

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
      console.info("[WebView] nav:", navState.url, "loading:", navState.loading);

      // Detect if the WebView navigated to the login page (session expired)
      // Skip during initial load to avoid false logout from redirect chains
      if (
        navState.url.includes("/login") &&
        !navState.url.includes("/api/auth")
      ) {
        loginRedirectCount.current += 1;
        console.info("[WebView] /login detected, count:", loginRedirectCount.current);

        // Only logout after dashboard has loaded at least once (real session expiry)
        // or if we've been stuck in a redirect loop
        if (hasLoadedOnce.current) {
          onLogout();
        } else if (loginRedirectCount.current > 3) {
          console.error("[WebView] redirect loop detected, logging out");
          onLogout();
        }
      }

      // Mark dashboard as loaded once
      if (navState.url.includes("/dashboard") && !navState.loading) {
        hasLoadedOnce.current = true;
        loginRedirectCount.current = 0;
      }
    },
    [onLogout]
  );

  const handleShouldStartLoad = useCallback((event: { url: string }) => {
    const url = event.url;

    // Allow glitchgrab URLs (with or without www)
    if (
      url.includes("glitchgrab.dev") ||
      url.includes("localhost") ||
      url.startsWith("about:")
    ) {
      return true;
    }

    // External links — open in system browser
    WebBrowser.openBrowserAsync(url);
    return false;
  }, []);

  // Load the session endpoint which sets the cookie via Set-Cookie header
  // and returns HTML that JS-redirects to /dashboard
  const webViewUrl = `${BASE_URL}/api/auth/mobile/session?token=${encodeURIComponent(sessionToken)}`;
  console.info("[WebView] loading URL:", BASE_URL + "/api/auth/mobile/session?token=<redacted>");

  // Runs BEFORE page content loads — sets viewport
  const injectedBeforeLoad = `
    (function() {
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

      // Force 16px on inputs + fix layout for mobile WebView
      var s = document.createElement('style');
      s.textContent = 'input,textarea,select{font-size:16px!important} html,body{height:calc(var(--app-height,100vh))!important;overflow:hidden}';
      document.head.appendChild(s);

      document.body.style.overscrollBehavior = 'none';
      document.addEventListener('gesturestart', function(e) { e.preventDefault(); });

      // Resize layout when Android keyboard opens/closes
      function updateAppHeight() {
        var h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        document.documentElement.style.setProperty('--app-height', h + 'px');
      }
      updateAppHeight();
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', updateAppHeight);
        window.visualViewport.addEventListener('scroll', updateAppHeight);
      }
      window.addEventListener('resize', updateAppHeight);

      // Scroll focused input into view when keyboard opens
      document.addEventListener('focusin', function(e) {
        var el = e.target;
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
          setTimeout(function() { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 300);
        }
      });
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_BG} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >

        {(loading || processingShare || sharedImageUri) && (
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
            {(processingShare || sharedImageUri) && (
              <Text style={{ color: "#a1a1aa", fontSize: 14, marginTop: 12 }}>
                Attaching screenshot...
              </Text>
            )}
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{
            uri: webViewUrl,
          }}
          style={styles.webview}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onLoadEnd={handleLoadEnd}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error("[WebView] onError:", nativeEvent.description, nativeEvent.url);
            setLoading(false);
            setError(true);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error("[WebView] onHttpError:", nativeEvent.statusCode, nativeEvent.url);
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
          hideKeyboardAccessoryView
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          cacheEnabled
          pullToRefreshEnabled={true}
          overScrollMode="content"
          decelerationRate={0.998}
          contentMode="mobile"
          setSupportMultipleWindows={false}
          scalesPageToFit={false}
          automaticallyAdjustContentInsets={false}
          automaticallyAdjustsScrollIndicatorInsets={false}
          keyboardDisplayRequiresUserAction={false}
        />
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
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
