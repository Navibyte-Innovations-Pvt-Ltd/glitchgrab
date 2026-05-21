import { YStack, Text } from "tamagui";

interface Props {
  icon?: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = "📭", title, subtitle }: Props) {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$3" padding="$6">
      <Text fontSize={48}>{icon}</Text>
      <Text color="$color" fontSize="$5" fontWeight="600" textAlign="center">
        {title}
      </Text>
      {subtitle && (
        <Text color="$mutedForeground" fontSize="$3" textAlign="center" lineHeight="$1">
          {subtitle}
        </Text>
      )}
    </YStack>
  );
}
