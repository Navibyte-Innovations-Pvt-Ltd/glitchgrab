import { FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { XStack, Text } from "tamagui";
import { useRepos } from "@/hooks/use-repos";
import { RepoCard } from "@/components/RepoCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ReposScreen() {
  const { data, isLoading, isFetching, refetch } = useRepos();
  const repos = data?.ownRepos ?? [];

  if (isLoading) return <LoadingSpinner message="Loading repos..." />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#09090b" }} edges={["top"]}>
      <XStack paddingHorizontal="$4" paddingTop="$4" paddingBottom="$3" alignItems="center" justifyContent="space-between">
        <Text color="$color" fontSize="$7" fontWeight="700">
          Repos
        </Text>
        <Text color="$mutedForeground" fontSize="$3">
          {repos.length} connected
        </Text>
      </XStack>

      {repos.length === 0 ? (
        <EmptyState
          icon="🔗"
          title="No repos connected"
          subtitle="Connect a GitHub repo on the web dashboard to start capturing bugs"
        />
      ) : (
        <FlatList
          data={repos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RepoCard repo={item} />}
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
    </SafeAreaView>
  );
}
