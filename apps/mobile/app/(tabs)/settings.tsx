import { Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { YStack, XStack, Text, Button } from "tamagui";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useRepos } from "@/hooks/use-repos";
import { useReports } from "@/hooks/use-reports";
import { BASE_URL } from "@/lib/api";

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <XStack
      paddingVertical="$3"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      alignItems="center"
      justifyContent="space-between"
    >
      <Text color="$mutedForeground" fontSize="$3">
        {label}
      </Text>
      <Text color="$color" fontSize="$3" fontWeight="500">
        {value}
      </Text>
    </XStack>
  );
}

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { data: reposData } = useRepos();
  const { data: reports } = useReports();

  const totalRepos = reposData?.ownRepos.length ?? 0;
  const totalReports = reports?.length ?? 0;

  function handleLogout() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await logout();
          void router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#09090b" }} edges={["top"]}>
      <YStack flex={1} padding="$4" gap="$6">
        {/* Header */}
        <Text color="$color" fontSize="$7" fontWeight="700">
          Settings
        </Text>

        {/* Profile card */}
        <YStack
          backgroundColor="$backgroundSecondary"
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius="$5"
          padding="$5"
          alignItems="center"
          gap="$3"
        >
          {user?.image ? (
            <Image
              source={{ uri: user.image }}
              style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: "#22d3ee" }}
            />
          ) : (
            <YStack
              width={72}
              height={72}
              borderRadius={36}
              backgroundColor="$backgroundSecondary"
              borderWidth={2}
              borderColor="$primary"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize={28}>{user?.name?.charAt(0) ?? "?"}</Text>
            </YStack>
          )}
          <YStack alignItems="center" gap="$1">
            <Text color="$color" fontSize="$5" fontWeight="700">
              {user?.name ?? "Unknown"}
            </Text>
            <Text color="$mutedForeground" fontSize="$3">
              {user?.email ?? ""}
            </Text>
          </YStack>
        </YStack>

        {/* Stats */}
        <YStack
          backgroundColor="$backgroundSecondary"
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius="$5"
          paddingHorizontal="$4"
        >
          <SettingRow label="Connected repos" value={String(totalRepos)} />
          <SettingRow label="Total reports" value={String(totalReports)} />
          <SettingRow label="API endpoint" value={BASE_URL.replace("https://", "").replace("http://", "")} />
        </YStack>

        {/* Danger zone */}
        <YStack gap="$3" marginTop="auto">
          <Button
            size="$5"
            backgroundColor="$errorSoft"
            borderWidth={1}
            borderColor="$error"
            color="$error"
            fontWeight="700"
            onPress={handleLogout}
            pressStyle={{ opacity: 0.8 }}
          >
            Sign Out
          </Button>

          <Text color="$mutedForeground" fontSize="$2" textAlign="center">
            Glitchgrab — Bug capture tool
          </Text>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
