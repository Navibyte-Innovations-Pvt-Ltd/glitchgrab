import { useState, useCallback } from "react";
import { Image, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { YStack, XStack, Text, Button } from "tamagui";
import { router } from "expo-router";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "@/contexts/AuthContext";
import { exchangeCodeForSession } from "@/lib/api";
import { Colors } from "@/lib/colors";

WebBrowser.maybeCompleteAuthSession();

const GITHUB_CLIENT_ID = "Ov23liOC0Kkx2zyMh7HQ";

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: "https://github.com/login/oauth/authorize",
  tokenEndpoint: "https://github.com/login/oauth/access_token",
};

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const redirectUri = AuthSession.makeRedirectUri({ scheme: "glitchgrab", preferLocalhost: true });

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    { clientId: GITHUB_CLIENT_ID, scopes: ["read:user", "user:email", "repo"], redirectUri },
    discovery
  );

  const handleLogin = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await promptAsync();

      if (result.type === "cancel" || result.type === "dismiss") {
        setLoading(false);
        return;
      }

      if (result.type !== "success" || !result.params.code) {
        throw new Error("OAuth flow did not return a code");
      }

      const { sessionToken, user } = await exchangeCodeForSession(
        result.params.code,
        request?.codeVerifier
      );

      await login(sessionToken, user);
      void router.replace("/(tabs)");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      Alert.alert("Sign in failed", msg, [{ text: "OK" }]);
    } finally {
      setLoading(false);
    }
  }, [loading, promptAsync, request?.codeVerifier, login]);

  return (
    <SafeAreaView style={styles.container}>
      <YStack flex={1} justifyContent="center" alignItems="center" paddingHorizontal="$8" gap="$4">
        <YStack marginBottom="$4">
          <Image source={require("../../assets/icon.png")} style={styles.logo} />
        </YStack>

        <YStack alignItems="center" gap="$2">
          <Text color="$color" fontSize="$8" fontWeight="700">
            Glitchgrab
          </Text>
          <Text color="$mutedForeground" fontSize="$4" textAlign="center">
            Sign in to start capturing bugs
          </Text>
        </YStack>

        <Button
          marginTop="$6"
          width="100%"
          size="$5"
          backgroundColor="$primary"
          onPress={handleLogin}
          disabled={loading || !request}
          opacity={loading ? 0.7 : 1}
        >
          <XStack alignItems="center" gap="$3">
            <Text fontSize={18}>🐙</Text>
            <Text color="$primaryForeground" fontSize="$4" fontWeight="700">
              {loading ? "Signing in..." : "Sign in with GitHub"}
            </Text>
          </XStack>
        </Button>

        <Text color="$mutedForeground" fontSize="$2" textAlign="center" marginTop="$2">
          By signing in, you agree to our Terms of Service
        </Text>
      </YStack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 24,
  },
});
