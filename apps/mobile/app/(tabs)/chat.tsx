import { useState, useRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { YStack, XStack, Text, Button } from "tamagui";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRepos } from "@/hooks/use-repos";
import { Colors } from "@/lib/colors";

type ReportType =
  | "BUG"
  | "FEATURE_REQUEST"
  | "UI_IMPROVEMENT"
  | "PERFORMANCE"
  | "SECURITY"
  | "QUESTION"
  | "OTHER";

const TYPE_OPTIONS: Array<{ type: ReportType; label: string; emoji: string; placeholder: string }> = [
  { type: "BUG", label: "Bug", emoji: "🐛", placeholder: "What went wrong? Describe the issue..." },
  { type: "FEATURE_REQUEST", label: "Feature", emoji: "⭐", placeholder: "Describe the feature you'd like..." },
  { type: "UI_IMPROVEMENT", label: "UI", emoji: "🎨", placeholder: "What looks off? Describe the visual issue..." },
  { type: "PERFORMANCE", label: "Performance", emoji: "⚡", placeholder: "What's slow? Describe when it happens..." },
  { type: "SECURITY", label: "Security", emoji: "🔒", placeholder: "Describe the security concern..." },
  { type: "QUESTION", label: "Question", emoji: "❓", placeholder: "What would you like to know?" },
  { type: "OTHER", label: "Other", emoji: "💬", placeholder: "Tell us what's on your mind..." },
];

export default function ChatScreen() {
  const [type, setType] = useState<ReportType>("BUG");
  const [description, setDescription] = useState("");
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const queryClient = useQueryClient();

  const { data: reposData } = useRepos();
  const repos = reposData?.ownRepos ?? [];

  const activeType = TYPE_OPTIONS.find((t) => t.type === type)!;

  async function handleSubmit() {
    if (!description.trim() || submitting) return;
    if (!selectedRepoId && repos.length > 1) {
      Alert.alert("Select a repo", "Please select which repo this report belongs to.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/v1/reports", {
        description: description.trim(),
        type,
        repoId: selectedRepoId ?? repos[0]?.id,
        source: "DASHBOARD_UPLOAD",
      });

      void queryClient.invalidateQueries({ queryKey: ["reports"] });
      setDescription("");
      setSubmitted(true);
      setTimeout(() => { setSubmitted(false); }, 3000);
    } catch {
      Alert.alert("Failed to submit", "Could not send the report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <YStack gap="$1" marginBottom="$2">
            <Text color="$color" fontSize="$7" fontWeight="700">
              Report a Bug
            </Text>
            <Text color="$mutedForeground" fontSize="$3">
              Describe the issue — we&apos;ll create a GitHub issue
            </Text>
          </YStack>

          {/* Type selector */}
          <YStack gap="$2">
            <Text color="$mutedForeground" fontSize="$2" fontWeight="600" textTransform="uppercase" letterSpacing={1}>
              Type
            </Text>
            <XStack gap="$2" flexWrap="wrap">
              {TYPE_OPTIONS.map((opt) => (
                <Button
                  key={opt.type}
                  size="$3"
                  flex={1}
                  minWidth="45%"
                  onPress={() => { setType(opt.type); }}
                  backgroundColor={type === opt.type ? "$primarySoft" : "$backgroundSecondary"}
                  borderWidth={1}
                  borderColor={type === opt.type ? "$primary" : "$borderColor"}
                  pressStyle={{ opacity: 0.8 }}
                >
                  <XStack alignItems="center" gap="$2">
                    <Text fontSize={14}>{opt.emoji}</Text>
                    <Text
                      color={type === opt.type ? "$primary" : "$mutedForeground"}
                      fontSize="$3"
                      fontWeight="600"
                    >
                      {opt.label}
                    </Text>
                  </XStack>
                </Button>
              ))}
            </XStack>
          </YStack>

          {/* Repo selector */}
          {repos.length > 1 && (
            <YStack gap="$2">
              <Text color="$mutedForeground" fontSize="$2" fontWeight="600" textTransform="uppercase" letterSpacing={1}>
                Repo
              </Text>
              <XStack gap="$2" flexWrap="wrap">
                {repos.map((repo) => (
                  <Button
                    key={repo.id}
                    size="$3"
                    onPress={() => { setSelectedRepoId(repo.id); }}
                    backgroundColor={selectedRepoId === repo.id ? "$primarySoft" : "$backgroundSecondary"}
                    borderWidth={1}
                    borderColor={selectedRepoId === repo.id ? "$primary" : "$borderColor"}
                    pressStyle={{ opacity: 0.8 }}
                  >
                    <Text
                      color={selectedRepoId === repo.id ? "$primary" : "$mutedForeground"}
                      fontSize="$2"
                    >
                      {repo.name}
                    </Text>
                  </Button>
                ))}
              </XStack>
            </YStack>
          )}

          {/* Description */}
          <YStack gap="$2">
            <Text color="$mutedForeground" fontSize="$2" fontWeight="600" textTransform="uppercase" letterSpacing={1}>
              Description
            </Text>
            <YStack
              borderWidth={1}
              borderColor="$borderColor"
              borderRadius="$4"
              backgroundColor="$backgroundSecondary"
              padding="$3"
            >
              <TextInput
                ref={inputRef}
                value={description}
                onChangeText={setDescription}
                placeholder={activeType.placeholder}
                placeholderTextColor={Colors.muted}
                multiline
                numberOfLines={6}
                style={styles.input}
                autoFocus={false}
              />
            </YStack>
            <Text color="$mutedForeground" fontSize="$1" textAlign="right">
              {description.length} chars
            </Text>
          </YStack>

          {/* Submit */}
          {submitted ? (
            <YStack
              backgroundColor="$successSoft"
              borderRadius="$4"
              padding="$4"
              alignItems="center"
            >
              <Text color="$success" fontWeight="700" fontSize="$4">
                ✓ Report sent!
              </Text>
              <Text color="$mutedForeground" fontSize="$2" marginTop="$1">
                GitHub issue created
              </Text>
            </YStack>
          ) : (
            <Button
              size="$5"
              backgroundColor={!description.trim() ? "$backgroundSecondary" : "$primary"}
              disabled={!description.trim() || submitting}
              onPress={handleSubmit}
              pressStyle={{ opacity: 0.85 }}
            >
              {submitting ? (
                <XStack alignItems="center" gap="$2">
                  <ActivityIndicator size="small" color={Colors.bg} />
                  <Text color="$primaryForeground" fontWeight="700">Sending...</Text>
                </XStack>
              ) : (
                <Text
                  color={!description.trim() ? "$mutedForeground" : "$primaryForeground"}
                  fontWeight="700"
                  fontSize="$4"
                >
                  Send Report
                </Text>
              )}
            </Button>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  input: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
    textAlignVertical: "top",
  },
});
