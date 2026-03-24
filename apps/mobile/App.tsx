import { useEffect, useState, useCallback } from "react";
import {
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  View,
  StatusBar,
  Image,
  Linking,
  Platform,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system";
import LoginScreen from "./src/screens/LoginScreen";
import WebViewScreen from "./src/screens/WebViewScreen";

const DARK_BG = "#09090b";
const PRIMARY = "#22d3ee";

type AppState = "loading" | "login" | "authenticated";

export default function App() {
  const [state, setState] = useState<AppState>("loading");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sharedImageUri, setSharedImageUri] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync("session_token");
        if (token) {
          setSessionToken(token);
          setState("authenticated");
        } else {
          setState("login");
        }
      } catch {
        setState("login");
      }
    })();
  }, []);

  // Handle shared images (Android share intent)
  useEffect(() => {
    async function handleSharedContent(url: string) {
      try {
        if (!url) return;

        // Android content:// URI — read the shared image
        if (url.startsWith("content://") || url.startsWith("file://")) {
          // Copy to app's cache directory for access
          const fileName = `shared_${Date.now()}.jpg`;
          const destUri = `${FileSystem.cacheDirectory}${fileName}`;
          await FileSystem.copyAsync({ from: url, to: destUri });

          // Read as base64
          const base64 = await FileSystem.readAsStringAsync(destUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          setSharedImageUri(`data:image/jpeg;base64,${base64}`);
        }
      } catch (err) {
        console.error("Failed to handle shared image:", err);
      }
    }

    // Check if app was opened with a shared image
    if (Platform.OS === "android") {
      Linking.getInitialURL().then((url) => {
        if (url) handleSharedContent(url);
      });

      const sub = Linking.addEventListener("url", (event) => {
        handleSharedContent(event.url);
      });

      return () => sub.remove();
    }
  }, []);

  const handleLoginSuccess = useCallback((token: string) => {
    setSessionToken(token);
    setState("authenticated");
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync("session_token");
    } catch {
      // Ignore SecureStore errors on logout
    }
    setSessionToken(null);
    setState("login");
  }, []);

  // Splash/loading state
  if (state === "loading") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={DARK_BG} />
        <View style={styles.splash}>
          <Image
            source={require("./assets/icon.png")}
            style={styles.splashIcon}
          />
          <ActivityIndicator
            size="small"
            color={PRIMARY}
            style={{ marginTop: 16 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Login screen
  if (state === "login") {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Authenticated — show WebView
  return (
    <WebViewScreen
      sessionToken={sessionToken!}
      onLogout={handleLogout}
      sharedImageUri={sharedImageUri}
      onSharedImageHandled={() => setSharedImageUri(null)}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  splash: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: DARK_BG,
  },
  splashIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
  },
});
