import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <LoadingSpinner />;

  if (isAuthenticated) return <Redirect href="/(tabs)" />;

  return <Redirect href="/(auth)/login" />;
}
