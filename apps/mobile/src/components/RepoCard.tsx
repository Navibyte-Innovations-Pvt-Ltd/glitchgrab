import { Pressable } from "react-native";
import { XStack, YStack, Text } from "tamagui";
import type { Repo } from "@/types";

interface Props {
  repo: Repo;
  onPress?: () => void;
}

export function RepoCard({ repo, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={{ marginBottom: 8 }}>
      {({ pressed }) => (
        <YStack
          backgroundColor={pressed ? "$backgroundSecondary" : "$background"}
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius="$4"
          padding="$4"
          gap="$3"
        >
          <XStack alignItems="center" justifyContent="space-between">
            <YStack flex={1} gap="$1">
              <Text color="$color" fontSize="$4" fontWeight="700">
                {repo.name}
              </Text>
              <Text color="$mutedForeground" fontSize="$2">
                {repo.owner}
              </Text>
            </YStack>
            {repo.private && (
              <Text
                backgroundColor="$backgroundSecondary"
                color="$mutedForeground"
                fontSize="$1"
                fontWeight="600"
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$2"
              >
                Private
              </Text>
            )}
          </XStack>

          <XStack gap="$4">
            <YStack alignItems="center" gap="$0.5">
              <Text color="$primary" fontSize="$5" fontWeight="700">
                {repo.reportCount}
              </Text>
              <Text color="$mutedForeground" fontSize="$1">
                Reports
              </Text>
            </YStack>
            <YStack alignItems="center" gap="$0.5">
              <Text color="$color" fontSize="$5" fontWeight="700">
                {repo.tokenCount}
              </Text>
              <Text color="$mutedForeground" fontSize="$1">
                Tokens
              </Text>
            </YStack>
          </XStack>
        </YStack>
      )}
    </Pressable>
  );
}
