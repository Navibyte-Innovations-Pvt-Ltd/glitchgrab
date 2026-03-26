import { useEffect, useRef, useState, useCallback } from "react";
import {
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
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import * as Clipboard from "expo-clipboard";
import { BASE_URL } from "../api";

const DARK_BG = "#09090b";
const PRIMARY = "#22d3ee";
const TEXT = "#fafafa";
const MUTED = "#a1a1aa";

interface WebViewScreenProps {
  sessionToken: string;
  overrideUrl?: string;
  onLogout: () => void;
  sharedImageUri?: string | null;
  onSharedImageHandled?: () => void;
  processingShare?: boolean;
}

export default function WebViewScreen({
  sessionToken,
  overrideUrl,
  onLogout,
  sharedImageUri,
  onSharedImageHandled,
  processingShare,
}: WebViewScreenProps) {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
  const handleLoadEnd = useCallback((e: { nativeEvent: { url: string } }) => {
    // Keep loading overlay until the actual page loads (skip the session redirect page)
    if (e.nativeEvent.url.includes("/api/auth/mobile/session")) return;
    setLoading(false);

    if (!pendingImageRef.current || !webViewRef.current) return;
    const imageUri = pendingImageRef.current;

    // Clear immediately to prevent duplicate injection if handleLoadEnd fires again
    pendingImageRef.current = null;

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

  // Track last nav key to skip duplicate callbacks (WebView fires them twice)
  const lastNavKey = useRef("");

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      // Skip duplicate callbacks for the same URL + loading state
      const navKey = `${navState.url}|${navState.loading}`;
      if (lastNavKey.current === navKey) return;
      lastNavKey.current = navKey;

      setCanGoBack(navState.canGoBack);

      // Detect if the WebView navigated to the login page (session expired)
      // Skip during initial load to avoid false logout from redirect chains
      if (
        navState.url.includes("/login") &&
        !navState.url.includes("/api/auth")
      ) {
        loginRedirectCount.current += 1;

        // Only logout after dashboard has loaded at least once (real session expiry)
        // or if we've been stuck in a redirect loop
        if (hasLoadedOnce.current) {
          onLogout();
        } else if (loginRedirectCount.current > 3) {
          // redirect loop detected
          onLogout();
        }
      }

      // Mark dashboard or collaborate page as loaded once
      if ((navState.url.includes("/dashboard") || navState.url.includes("/collaborate")) && !navState.loading) {
        hasLoadedOnce.current = true;
        loginRedirectCount.current = 0;
      }
    },
    [onLogout]
  );

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "clipboard-copy" && data.text) {
        Clipboard.setStringAsync(data.text);
      }
    } catch {
      // Not a JSON message, ignore
    }
  }, []);

  const handleShouldStartLoad = useCallback((event: { url: string }) => {
    const url = event.url;

    // Allow glitchgrab, Razorpay + its payment partners, and local dev
    if (
      url.includes("glitchgrab.dev") ||
      url.includes("localhost") ||
      url.includes("razorpay.com") ||
      url.includes("sardine.ai") ||
      url.includes("razorpay.in") ||
      url.startsWith("about:") ||
      url.startsWith("upi://")
    ) {
      return true;
    }

    // External links — open in system browser
    WebBrowser.openBrowserAsync(url);
    return false;
  }, []);

  // Load the session endpoint which sets the cookie via Set-Cookie header
  // and returns HTML that JS-redirects to /dashboard
  // Or use overrideUrl for collaborator mode
  const webViewUrl = overrideUrl || `${BASE_URL}/api/auth/mobile/session?token=${encodeURIComponent(sessionToken)}`;

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

      // Force 16px on inputs + fix layout for mobile WebView (all via <style> to avoid hydration mismatch)
      var s = document.createElement('style');
      s.id = 'glitchgrab-webview';
      s.textContent = 'input,textarea,select{font-size:16px!important} body{height:calc(var(--app-height,100vh))!important;overflow:hidden;overscroll-behavior:none}';
      document.head.appendChild(s);

      document.addEventListener('gesturestart', function(e) { e.preventDefault(); });

      // Resize layout when Android keyboard opens/closes (debounced to avoid layout thrashing)
      var _rafId = 0;
      var _styleTag = s;
      function updateAppHeight() {
        if (_rafId) return;
        _rafId = requestAnimationFrame(function() {
          _rafId = 0;
          var h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
          _styleTag.textContent = 'input,textarea,select{font-size:16px!important} body{height:' + h + 'px!important;overflow:hidden;overscroll-behavior:none} :root{--app-height:' + h + 'px}';
        });
      }
      updateAppHeight();
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', updateAppHeight);
        // NOTE: removed 'scroll' listener — it fires on every scroll frame and causes jank
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
        style={styles.flex1}
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
              style={styles.loadingSpinner}
            />
            {(processingShare || sharedImageUri) && (
              <Text style={styles.loadingText}>
                Attaching screenshot...
              </Text>
            )}
          </View>
        )}

        {Platform.OS === "android" ? (
          <ScrollView
            contentContainerStyle={styles.flex1}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  webViewRef.current?.reload();
                  setTimeout(() => setRefreshing(false), 1500);
                }}
                colors={[PRIMARY]}
                tintColor={PRIMARY}
              />
            }
          >
            <WebView
              ref={webViewRef}
              source={{ uri: webViewUrl }}
              style={styles.webview}
              onNavigationStateChange={handleNavigationStateChange}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              onLoadEnd={handleLoadEnd}
              onMessage={handleMessage}
              onError={() => { setLoading(false); setError(true); }}
              onHttpError={(syntheticEvent) => {
                if (syntheticEvent.nativeEvent.statusCode >= 500) setError(true);
              }}
              androidLayerType="hardware"
              injectedJavaScriptBeforeContentLoaded={injectedBeforeLoad}
              injectedJavaScript={injectedAfterLoad}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState={false}
              hideKeyboardAccessoryView
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              mediaPlaybackRequiresUserAction={false}
              cacheEnabled
              overScrollMode="never"
              decelerationRate={0.998}
              contentMode="mobile"
              setSupportMultipleWindows={false}
              scalesPageToFit={false}
              automaticallyAdjustContentInsets={false}
              keyboardDisplayRequiresUserAction={false}
              nestedScrollEnabled
            />
          </ScrollView>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: webViewUrl }}
            style={styles.webview}
            onNavigationStateChange={handleNavigationStateChange}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            onLoadEnd={handleLoadEnd}
            onMessage={handleMessage}
            onError={() => { setLoading(false); setError(true); }}
            onHttpError={(syntheticEvent) => {
              if (syntheticEvent.nativeEvent.statusCode >= 500) setError(true);
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
            pullToRefreshEnabled
            bounces
            overScrollMode="content"
            decelerationRate={0.998}
            contentMode="mobile"
            setSupportMultipleWindows={false}
            scalesPageToFit={false}
            automaticallyAdjustContentInsets={false}
            automaticallyAdjustsScrollIndicatorInsets={false}
            keyboardDisplayRequiresUserAction={false}
          />
        )}
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0,
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
    color: TEXT,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  errorText: {
    color: MUTED,
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
  flex1: {
    flex: 1,
  },
  loadingSpinner: {
    marginTop: 16,
  },
  loadingText: {
    color: MUTED,
    fontSize: 14,
    marginTop: 12,
  },
});
