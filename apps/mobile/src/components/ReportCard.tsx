import { Pressable } from "react-native";
import { XStack, YStack, Text } from "tamagui";
import type { Report } from "@/types";

const SOURCE_LABELS: Record<Report["source"], string> = {
  SDK_AUTO: "Auto",
  SDK_USER_REPORT: "User",
  DASHBOARD_UPLOAD: "Upload",
  HANDWRITTEN_NOTE: "Note",
  MCP: "MCP",
  COLLABORATOR: "Collab",
};

const STATUS_COLORS: Record<Report["status"], string> = {
  PENDING: "#f59e0b",
  PROCESSING: "#3b82f6",
  CREATED: "#22c55e",
  DUPLICATE: "#a1a1aa",
  FAILED: "#ef4444",
};

interface Props {
  report: Report;
  onPress?: () => void;
}

export function ReportCard({ report, onPress }: Props) {
  const statusColor = STATUS_COLORS[report.status];
  const sourceLabel = SOURCE_LABELS[report.source];
  const title = report.issue?.title ?? report.rawInput?.slice(0, 80) ?? "Untitled report";
  const date = new Date(report.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Pressable onPress={onPress} style={{ marginBottom: 8 }}>
      {({ pressed }) => (
        <YStack
          backgroundColor={pressed ? "$backgroundSecondary" : "$background"}
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius="$4"
          padding="$4"
          gap="$2"
        >
          <XStack alignItems="center" justifyContent="space-between">
            <XStack gap="$2" alignItems="center" flex={1}>
              <Text
                backgroundColor={`${statusColor}20`}
                color={statusColor}
                fontSize="$1"
                fontWeight="700"
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$2"
              >
                {report.status}
              </Text>
              <Text
                backgroundColor="$backgroundSecondary"
                color="$mutedForeground"
                fontSize="$1"
                fontWeight="600"
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$2"
              >
                {sourceLabel}
              </Text>
            </XStack>
            <Text color="$mutedForeground" fontSize="$1">
              {date}
            </Text>
          </XStack>

          <Text color="$color" fontSize="$3" fontWeight="600" numberOfLines={2}>
            {title}
          </Text>

          {report.repo && (
            <Text color="$mutedForeground" fontSize="$2">
              {report.repo.fullName}
            </Text>
          )}

          {report.issue && (
            <XStack gap="$2" flexWrap="wrap">
              {report.issue.labels.slice(0, 3).map((label) => (
                <Text
                  key={label}
                  backgroundColor="$backgroundSecondary"
                  color="$mutedForeground"
                  fontSize="$1"
                  paddingHorizontal="$2"
                  paddingVertical="$0.5"
                  borderRadius="$10"
                >
                  {label}
                </Text>
              ))}
            </XStack>
          )}
        </YStack>
      )}
    </Pressable>
  );
}
