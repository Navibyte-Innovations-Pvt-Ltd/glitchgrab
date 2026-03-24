import { useEffect, useState, useCallback } from "react";
import {
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  View,
  StatusBar,
  Image,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system";
import { useShareIntent } from "expo-share-intent";
import LoginScreen from "./src/screens/LoginScreen";
import WebViewScreen from "./src/screens/WebViewScreen";

const DARK_BG = "#09090b";
const PRIMARY = "#22d3ee";

type AppState = "loading" | "login" | "authenticated";

export default function App() {
  const [state, setState] = useState<AppState>("loading");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sharedImageBase64, setSharedImageBase64] = useState<string | null>(null);

  // Listen for shared content
  const { shareIntent, resetShareIntent } = useShareIntent();

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

  // Handle shared image when it arrives
  useEffect(() => {
    if (!shareIntent?.files?.length) return;

    const file = shareIntent.files[0];
    if (!file?.path) return;

    (async () => {
      try {
        const base64 = await FileSystem.readAsStringAsync(file.path, {
          encoding: "base64",
        });
        const mimeType = file.mimeType || "image/jpeg";
        setSharedImageBase64(`data:${mimeType};base64,${base64}`);
        resetShareIntent();
      } catch (err) {
        console.error("Failed to read shared image:", err);
        resetShareIntent();
      }
    })();
  }, [shareIntent, resetShareIntent]);

  const handleLoginSuccess = useCallback((token: string) => {
    setSessionToken(token);
    setState("authenticated");
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync("session_token");
    } catch {
      // Ignore
    }
    setSessionToken(null);
    setState("login");
  }, []);

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

  if (state === "login") {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <WebViewScreen
      sessionToken={sessionToken!}
      onLogout={handleLogout}
      sharedImageUri={sharedImageBase64}
      onSharedImageHandled={() => setSharedImageBase64(null)}
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
