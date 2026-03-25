import { useEffect, useState, useCallback } from "react";
import {
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  View,
  StatusBar,
  Image,
  Linking,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import { useShareIntent } from "expo-share-intent";
import LoginScreen from "./src/screens/LoginScreen";
import WebViewScreen from "./src/screens/WebViewScreen";
import { BASE_URL } from "./src/api";

const DARK_BG = "#09090b";
const PRIMARY = "#22d3ee";

type AppState = "loading" | "login" | "authenticated" | "collaborator";

export default function App() {
  const [state, setState] = useState<AppState>("loading");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [collabToken, setCollabToken] = useState<string | null>(null);
  const [sharedImageBase64, setSharedImageBase64] = useState<string | null>(null);
  const [processingShare, setProcessingShare] = useState(false);

  // Listen for shared content
  const { shareIntent, resetShareIntent } = useShareIntent();

  // Handle deep links for collaborate invitations
  const handleDeepLink = useCallback(({ url }: { url: string }) => {
    try {
      // Handle both glitchgrab:// and https://glitchgrab.dev URLs
      const parsed = new URL(url.replace("glitchgrab://", "https://glitchgrab.dev/"));
      if (parsed.pathname.includes("/collaborate/accept")) {
        const token = parsed.searchParams.get("token");
        if (token) {
          setCollabToken(token);
          setState("collaborator");
        }
      }
    } catch {
      // Ignore invalid URLs
    }
  }, []);

  // Listen for deep links
  useEffect(() => {
    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener("url", handleDeepLink);
    return () => subscription.remove();
  }, [handleDeepLink]);

  // Check for existing session on mount
  useEffect(() => {
    (async () => {
      try {
        // Check for collaborator session first
        const savedCollabToken = await SecureStore.getItemAsync("collab_token");
        if (savedCollabToken) {
          setCollabToken(savedCollabToken);
          setState("collaborator");
          return;
        }

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

    setProcessingShare(true);
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
      } finally {
        setProcessingShare(false);
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
      await SecureStore.deleteItemAsync("collab_token");
    } catch {
      // Ignore
    }
    setSessionToken(null);
    setCollabToken(null);
    setState("login");
  }, []);

  // Save collab token when entering collaborator mode
  useEffect(() => {
    if (state === "collaborator" && collabToken) {
      SecureStore.setItemAsync("collab_token", collabToken).catch(() => {});
    }
  }, [state, collabToken]);

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

  if (state === "collaborator" && collabToken) {
    // Collaborator mode: WebView loads the accept URL which sets cookie + redirects to /collaborate
    const collabUrl = `${BASE_URL}/api/v1/collaborators/accept?token=${encodeURIComponent(collabToken)}`;
    return (
      <WebViewScreen
        sessionToken=""
        overrideUrl={collabUrl}
        onLogout={handleLogout}
        sharedImageUri={null}
      />
    );
  }

  return (
    <WebViewScreen
      sessionToken={sessionToken!}
      onLogout={handleLogout}
      sharedImageUri={sharedImageBase64}
      onSharedImageHandled={() => setSharedImageBase64(null)}
      processingShare={processingShare}
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
