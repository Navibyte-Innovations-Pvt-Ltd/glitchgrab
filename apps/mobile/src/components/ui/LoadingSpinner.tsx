import { ActivityIndicator } from "react-native";
import { YStack, Text } from "tamagui";

interface Props {
  message?: string;
  size?: "small" | "large";
}

export function LoadingSpinner({ message, size = "large" }: Props) {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$3" backgroundColor="$background">
      <ActivityIndicator size={size} color="#22d3ee" />
      {message && (
        <Text color="$mutedForeground" fontSize="$3">
          {message}
        </Text>
      )}
    </YStack>
  );
}
