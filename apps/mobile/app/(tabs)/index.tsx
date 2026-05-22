import { ScrollView, RefreshControl, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { YStack, XStack, Text } from "tamagui";
import { useAuth } from "@/contexts/AuthContext";
import { useRepos } from "@/hooks/use-repos";
import { useReports } from "@/hooks/use-reports";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ReportCard } from "@/components/ReportCard";
import { router } from "expo-router";

function StatCard({ value, label, color = "$color" }: { value: number | string; label: string; color?: string }) {
  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius="$4"
      padding="$4"
      alignItems="center"
      gap="$1"
    >
      <Text fontSize="$8" fontWeight="700" color={color as never}>
        {value}
      </Text>
      <Text fontSize="$2" color="$mutedForeground" fontWeight="600">
        {label}
      </Text>
    </YStack>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { data: reposData, isLoading: reposLoading, refetch: refetchRepos } = useRepos();
  const { data: reports, isLoading: reportsLoading, refetch: refetchReports } = useReports();

  const isLoading = reposLoading || reportsLoading;
  const isRefreshing = false;

  const totalRepos = reposData?.all.length ?? 0;
  const totalReports = reports?.length ?? 0;
  const openIssues = reports?.filter((r) => r.issue && r.status === "CREATED").length ?? 0;
  const recentReports = (reports ?? []).slice(0, 5);

  async function handleRefresh() {
    await Promise.all([refetchRepos(), refetchReports()]);
  }

  if (isLoading) return <LoadingSpinner message="Loading dashboard..." />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#09090b" }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#22d3ee" />
        }
      >
        {/* Header */}
        <XStack alignItems="center" justifyContent="space-between" marginBottom="$6">
          <YStack gap="$0.5">
            <Text color="$mutedForeground" fontSize="$3">
              Good {getGreeting()},
            </Text>
            <Text color="$color" fontSize="$6" fontWeight="700">
              {user?.name?.split(" ")[0] ?? "Dev"}
            </Text>
          </YStack>
          {user?.image ? (
            <Image
              source={{ uri: user.image }}
              style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: "#22d3ee" }}
            />
          ) : null}
        </XStack>

        {/* Stats */}
        <Text color="$mutedForeground" fontSize="$2" fontWeight="600" marginBottom="$3" textTransform="uppercase" letterSpacing={1}>
          Overview
        </Text>
        <XStack gap="$3" marginBottom="$6">
          <StatCard value={totalRepos} label="Repos" />
          <StatCard value={totalReports} label="Reports" />
          <StatCard value={openIssues} label="Open" color="$primary" />
        </XStack>

        {/* Recent Reports */}
        <Text color="$mutedForeground" fontSize="$2" fontWeight="600" marginBottom="$3" textTransform="uppercase" letterSpacing={1}>
          Recent Reports
        </Text>
        {recentReports.length === 0 ? (
          <YStack
            backgroundColor="$background"
            borderWidth={1}
            borderColor="$borderColor"
            borderRadius="$4"
            padding="$6"
            alignItems="center"
            gap="$2"
          >
            <Text fontSize={32}>🐞</Text>
            <Text color="$mutedForeground" fontSize="$3" textAlign="center">
              No reports yet. Integrate the SDK to start capturing bugs.
            </Text>
          </YStack>
        ) : (
          <YStack gap="$0">
            {recentReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onPress={() => router.push(`/report/${report.id}`)}
              />
            ))}
            {totalReports > 5 && (
              <Text
                color="$primary"
                fontSize="$3"
                fontWeight="600"
                textAlign="center"
                marginTop="$2"
                onPress={() => router.push("/(tabs)/reports")}
              >
                View all {totalReports} reports →
              </Text>
            )}
          </YStack>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
