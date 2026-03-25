import { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import { exchangeCodeForSession } from "../api";

// Ensure browser auth session completes properly
WebBrowser.maybeCompleteAuthSession();

const DARK_BG = "#09090b";
const PRIMARY = "#22d3ee";
const TEXT = "#fafafa";
const MUTED = "#a1a1aa";

const GITHUB_CLIENT_ID = "Ov23liOC0Kkx2zyMh7HQ";

// GitHub OAuth endpoints
const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: "https://github.com/login/oauth/authorize",
  tokenEndpoint: "https://github.com/login/oauth/access_token",
};

interface LoginScreenProps {
  onLoginSuccess: (sessionToken: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "glitchgrab",
    preferLocalhost: true,
  });

  // Log redirect URI so you can add it to GitHub OAuth settings
  console.info("Expo redirect URI:", redirectUri);

  const [request, _response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GITHUB_CLIENT_ID,
      scopes: ["read:user", "user:email", "repo"],
      redirectUri,
    },
    discovery
  );

  const handleLogin = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      const result = await promptAsync();

      if (result.type !== "success" || !result.params.code) {
        if (result.type === "cancel" || result.type === "dismiss") {
          // User cancelled — just reset
          setLoading(false);
          return;
        }
        throw new Error("OAuth flow did not return a code");
      }

      const code = result.params.code;
      const codeVerifier = request?.codeVerifier;
      console.info("Got OAuth code, exchanging...");

      // Send code + verifier to our backend
      const { sessionToken } = await exchangeCodeForSession(code, codeVerifier);
      console.info("Got session token:", sessionToken ? "yes" : "no", "length:", sessionToken?.length);

      // Store session token securely
      await SecureStore.setItemAsync("session_token", sessionToken);
      console.info("Stored token, navigating to WebView...");

      // Navigate to WebView
      onLoginSuccess(sessionToken);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      console.error("Login error:", err);
      Alert.alert(
        "Sign in failed",
        message,
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  }, [loading, promptAsync, onLoginSuccess, request?.codeVerifier]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_BG} />

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/icon.png")}
            style={styles.logo}
          />
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.title}>Welcome to Glitchgrab</Text>
        <Text style={styles.subtitle}>
          Sign in with GitHub to start capturing bugs
        </Text>

        {/* GitHub Sign-in Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading || !request}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color={DARK_BG} />
          ) : (
            <GitHubIcon />
          )}
          <Text style={styles.buttonText}>
            {loading ? "Signing in..." : "Sign in with GitHub"}
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>
          By signing in, you agree to our Terms of Service
        </Text>
      </View>
    </SafeAreaView>
  );
}

/** Simple GitHub icon rendered with View/Text */
function GitHubIcon() {
  return (
    <Image
      source={{ uri: "https://github.com/fluidicon.png" }}
      style={styles.githubIcon}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 32,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 24,
  },
  title: {
    color: TEXT,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: MUTED,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 48,
    lineHeight: 22,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: "100%",
    gap: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: DARK_BG,
    fontSize: 17,
    fontWeight: "700",
  },
  footer: {
    color: MUTED,
    fontSize: 12,
    textAlign: "center",
    marginTop: 24,
  },
  githubIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
});
