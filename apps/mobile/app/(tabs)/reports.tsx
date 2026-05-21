import { useState } from "react";
import { FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { YStack, XStack, Text, Button } from "tamagui";
import { router } from "expo-router";
import { useReports } from "@/hooks/use-reports";
import { ReportCard } from "@/components/ReportCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Report } from "@/types";

const STATUS_FILTERS: Array<{ label: string; value: Report["status"] | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Created", value: "CREATED" },
  { label: "Pending", value: "PENDING" },
  { label: "Failed", value: "FAILED" },
  { label: "Duplicate", value: "DUPLICATE" },
];

export default function ReportsScreen() {
  const [activeFilter, setActiveFilter] = useState<Report["status"] | "ALL">("ALL");
  const { data: reports, isLoading, isFetching, refetch } = useReports();

  const filtered = (reports ?? []).filter(
    (r) => activeFilter === "ALL" || r.status === activeFilter
  );

  if (isLoading) return <LoadingSpinner message="Loading reports..." />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#09090b" }} edges={["top"]}>
      <YStack flex={1}>
        {/* Header */}
        <XStack paddingHorizontal="$4" paddingTop="$4" paddingBottom="$3" alignItems="center" justifyContent="space-between">
          <Text color="$color" fontSize="$7" fontWeight="700">
            Reports
          </Text>
          <Text color="$mutedForeground" fontSize="$3">
            {filtered.length} total
          </Text>
        </XStack>

        {/* Filters */}
        <XStack paddingHorizontal="$4" paddingBottom="$3" gap="$2" flexWrap="wrap">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              size="$3"
              onPress={() => setActiveFilter(f.value)}
              backgroundColor={activeFilter === f.value ? "$primary" : "$backgroundSecondary"}
              color={activeFilter === f.value ? "$primaryForeground" : "$mutedForeground"}
              borderWidth={1}
              borderColor={activeFilter === f.value ? "$primary" : "$borderColor"}
              pressStyle={{ opacity: 0.8 }}
            >
              {f.label}
            </Button>
          ))}
        </XStack>

        {filtered.length === 0 ? (
          <EmptyState
            icon="🐞"
            title="No reports found"
            subtitle="Reports from your connected repos will appear here"
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ReportCard
                report={item}
                onPress={() => router.push(`/report/${item.id}`)}
              />
            )}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={
              <RefreshControl
                refreshing={isFetching}
                onRefresh={() => void refetch()}
                tintColor="#22d3ee"
              />
            }
          />
        )}
      </YStack>
    </SafeAreaView>
  );
}
