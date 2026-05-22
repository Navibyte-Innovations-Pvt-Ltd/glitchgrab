import type { ReactNode } from "react";
import { ScrollView, Linking, Pressable, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { YStack, XStack, Text } from "tamagui";
import { useLocalSearchParams, router } from "expo-router";
import { useReport } from "@/hooks/use-reports";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const MONO_FONT = Platform.OS === "ios" ? "Courier" : "monospace";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  PROCESSING: "#3b82f6",
  CREATED: "#22c55e",
  DUPLICATE: "#a1a1aa",
  FAILED: "#ef4444",
};

const SOURCE_LABELS: Record<string, string> = {
  SDK_AUTO: "Auto-captured",
  SDK_USER_REPORT: "User report",
  DASHBOARD_UPLOAD: "Dashboard",
  HANDWRITTEN_NOTE: "Note",
  MCP: "MCP",
  COLLABORATOR: "Collaborator",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <YStack gap="$2" marginBottom="$5">
      <Text color="$mutedForeground" fontSize="$2" fontWeight="600" textTransform="uppercase" letterSpacing={1}>
        {title}
      </Text>
      {children}
    </YStack>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <XStack justifyContent="space-between" paddingVertical="$2" borderBottomWidth={1} borderBottomColor="$borderColor">
      <Text color="$mutedForeground" fontSize="$3">{label}</Text>
      <Text color="$color" fontSize="$3" fontWeight="500" flex={1} textAlign="right" numberOfLines={2}>{value}</Text>
    </XStack>
  );
}

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useReport(id);

  if (isLoading) return <LoadingSpinner message="Loading report..." />;

  const report = data?.report;
  if (!report) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#09090b" }} edges={["top"]}>
        <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
          <Text fontSize={40}>🔍</Text>
          <Text color="$color" fontSize="$5" fontWeight="600">Report not found</Text>
          <Text color="$primary" onPress={() => router.back()}>← Go back</Text>
        </YStack>
      </SafeAreaView>
    );
  }

  const statusColor = STATUS_COLORS[report.status] ?? "#a1a1aa";
  const title = report.issue?.title ?? report.rawInput?.slice(0, 80) ?? "Untitled report";
  const date = new Date(report.createdAt).toLocaleString();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#09090b" }} edges={["top"]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Close button */}
        <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text color="$primary" fontSize="$3">← Back</Text>
        </Pressable>

        {/* Status + source badges */}
        <XStack gap="$2" marginBottom="$4" flexWrap="wrap">
          <Text
            backgroundColor={`${statusColor}20`}
            color={statusColor}
            fontSize="$2"
            fontWeight="700"
            paddingHorizontal="$3"
            paddingVertical="$1"
            borderRadius="$10"
          >
            {report.status}
          </Text>
          <Text
            backgroundColor="$backgroundSecondary"
            color="$mutedForeground"
            fontSize="$2"
            fontWeight="600"
            paddingHorizontal="$3"
            paddingVertical="$1"
            borderRadius="$10"
          >
            {SOURCE_LABELS[report.source] ?? report.source}
          </Text>
        </XStack>

        {/* Title */}
        <Text color="$color" fontSize="$6" fontWeight="700" marginBottom="$4" lineHeight="$2">
          {title}
        </Text>

        {/* GitHub issue link */}
        {report.issue?.githubUrl && (
          <Pressable
            onPress={() => Linking.openURL(report.issue!.githubUrl)}
            style={{ marginBottom: 24 }}
          >
            <XStack
              backgroundColor="$primarySoft"
              borderWidth={1}
              borderColor="$primary"
              borderRadius="$4"
              padding="$3"
              alignItems="center"
              justifyContent="space-between"
            >
              <Text color="$primary" fontSize="$3" fontWeight="600">
                GitHub Issue #{report.issue.githubNumber}
              </Text>
              <Text color="$primary" fontSize="$3">↗</Text>
            </XStack>
          </Pressable>
        )}

        {/* Details */}
        <Section title="Details">
          <YStack backgroundColor="$backgroundSecondary" borderWidth={1} borderColor="$borderColor" borderRadius="$4" paddingHorizontal="$4">
            <InfoRow label="Repo" value={report.repo?.fullName ?? "—"} />
            <InfoRow label="Created" value={date} />
            {report.pageUrl && <InfoRow label="Page" value={report.pageUrl} />}
            {report.reporterName && <InfoRow label="Reporter" value={report.reporterName} />}
            {report.reporterEmail && <InfoRow label="Email" value={report.reporterEmail} />}
          </YStack>
        </Section>

        {/* Description */}
        {report.rawInput && (
          <Section title="Description">
            <YStack
              backgroundColor="$backgroundSecondary"
              borderWidth={1}
              borderColor="$borderColor"
              borderRadius="$4"
              padding="$4"
            >
              <Text color="$color" fontSize="$3" lineHeight="$1">
                {report.rawInput}
              </Text>
            </YStack>
          </Section>
        )}

        {/* Error stack */}
        {report.errorStack && (
          <Section title="Stack Trace">
            <ScrollView
              horizontal
              style={{ backgroundColor: "#18181b", borderRadius: 8, borderWidth: 1, borderColor: "#2c2c2e" }}
              contentContainerStyle={{ padding: 12 }}
            >
              <Text
                color="#a1a1aa"
                fontSize={11}
                style={{ fontFamily: MONO_FONT }}
              >
                {report.errorStack}
              </Text>
            </ScrollView>
          </Section>
        )}

        {/* Labels */}
        {report.issue?.labels && report.issue.labels.length > 0 && (
          <Section title="Labels">
            <XStack gap="$2" flexWrap="wrap">
              {report.issue.labels.map((label) => (
                <Text
                  key={label}
                  backgroundColor="$backgroundSecondary"
                  color="$mutedForeground"
                  fontSize="$2"
                  fontWeight="600"
                  paddingHorizontal="$3"
                  paddingVertical="$1"
                  borderRadius="$10"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  {label}
                </Text>
              ))}
            </XStack>
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

