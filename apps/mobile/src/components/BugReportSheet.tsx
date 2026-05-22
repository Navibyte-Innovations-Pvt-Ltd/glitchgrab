import { useState } from "react";
import {
  TextInput,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Sheet } from "@tamagui/sheet";
import { YStack as YStackCore, XStack as XStackCore, Text as TextCore, Button as ButtonCore } from "tamagui";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRepos } from "@/hooks/use-repos";
import { Colors } from "@/lib/colors";
import * as FileSystem from "expo-file-system";

type ReportType = "BUG" | "FEATURE_REQUEST" | "QUESTION" | "OTHER";

const TYPE_OPTIONS: Array<{ type: ReportType; label: string; emoji: string }> = [
  { type: "BUG", label: "Bug", emoji: "🐛" },
  { type: "FEATURE_REQUEST", label: "Feature", emoji: "⭐" },
  { type: "QUESTION", label: "Question", emoji: "❓" },
  { type: "OTHER", label: "Other", emoji: "💬" },
];

interface BugReportSheetProps {
  open: boolean;
  onClose: () => void;
  screenshotUri?: string | null;
}

export function BugReportSheet({ open, onClose, screenshotUri }: BugReportSheetProps) {
  const [type, setType] = useState<ReportType>("BUG");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const queryClient = useQueryClient();
  const { data: reposData } = useRepos();
  const repos = reposData?.ownRepos ?? [];

  function handleClose() {
    setDescription("");
    setType("BUG");
    setSubmitted(false);
    onClose();
  }

  async function handleSubmit() {
    if (!description.trim() || submitting) return;
    setSubmitting(true);
    try {
      let screenshotBase64: string | undefined;
      if (screenshotUri) {
        screenshotBase64 = await FileSystem.readAsStringAsync(screenshotUri, {
          encoding: "base64",
        });
      }

      await api.post("/api/v1/reports", {
        description: description.trim(),
        type,
        repoId: repos[0]?.id,
        source: "DASHBOARD_UPLOAD",
        ...(screenshotBase64 ? { screenshotBase64 } : {}),
      });

      void queryClient.invalidateQueries({ queryKey: ["reports"] });
      setSubmitted(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch {
      // silent — user can retry
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o: boolean) => { if (!o) handleClose(); }}
      snapPoints={[88]}
      dismissOnSnapToBottom
      zIndex={100_000}
    >
      <Sheet.Overlay />
      <Sheet.Frame backgroundColor="$background" borderTopLeftRadius="$5" borderTopRightRadius="$5">
        <Sheet.Handle backgroundColor="$borderColor" />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={20}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <YStackCore gap="$4">
              <XStackCore alignItems="center" justifyContent="space-between">
                <TextCore color="$color" fontSize="$6" fontWeight="700">
                  Report a Bug
                </TextCore>
                <ButtonCore
                  size="$2"
                  chromeless
                  onPress={handleClose}
                  pressStyle={{ opacity: 0.6 }}
                >
                  <TextCore color="$mutedForeground" fontSize="$4">✕</TextCore>
                </ButtonCore>
              </XStackCore>

              {screenshotUri ? (
                <YStackCore
                  borderWidth={1}
                  borderColor="$borderColor"
                  borderRadius="$4"
                  overflow="hidden"
                >
                  <Image
                    source={{ uri: screenshotUri }}
                    style={styles.screenshot}
                    resizeMode="contain"
                  />
                </YStackCore>
              ) : null}

              {/* Type selector */}
              <YStackCore gap="$2">
                <TextCore
                  color="$mutedForeground"
                  fontSize="$2"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing={1}
                >
                  Type
                </TextCore>
                <XStackCore gap="$2" flexWrap="wrap">
                  {TYPE_OPTIONS.map((opt) => (
                    <ButtonCore
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
                      <XStackCore alignItems="center" gap="$2">
                        <TextCore fontSize={13}>{opt.emoji}</TextCore>
                        <TextCore
                          color={type === opt.type ? "$primary" : "$mutedForeground"}
                          fontSize="$3"
                          fontWeight="600"
                        >
                          {opt.label}
                        </TextCore>
                      </XStackCore>
                    </ButtonCore>
                  ))}
                </XStackCore>
              </YStackCore>

              {/* Description */}
              <YStackCore gap="$2">
                <TextCore
                  color="$mutedForeground"
                  fontSize="$2"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing={1}
                >
                  Description
                </TextCore>
                <YStackCore
                  borderWidth={1}
                  borderColor="$borderColor"
                  borderRadius="$4"
                  backgroundColor="$backgroundSecondary"
                  padding="$3"
                >
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Describe the bug..."
                    placeholderTextColor={Colors.muted}
                    multiline
                    numberOfLines={5}
                    style={styles.input}
                    autoFocus
                  />
                </YStackCore>
              </YStackCore>

              {submitted ? (
                <YStackCore
                  backgroundColor="$successSoft"
                  borderRadius="$4"
                  padding="$4"
                  alignItems="center"
                >
                  <TextCore color="$success" fontWeight="700" fontSize="$4">
                    ✓ Report sent!
                  </TextCore>
                  <TextCore color="$mutedForeground" fontSize="$2" marginTop="$1">
                    GitHub issue created
                  </TextCore>
                </YStackCore>
              ) : (
                <ButtonCore
                  size="$5"
                  backgroundColor={!description.trim() ? "$backgroundSecondary" : "$primary"}
                  disabled={!description.trim() || submitting}
                  onPress={() => { void handleSubmit(); }}
                  pressStyle={{ opacity: 0.85 }}
                >
                  {submitting ? (
                    <XStackCore alignItems="center" gap="$2">
                      <ActivityIndicator size="small" color={Colors.bg} />
                      <TextCore color="$primaryForeground" fontWeight="700">Sending...</TextCore>
                    </XStackCore>
                  ) : (
                    <TextCore
                      color={!description.trim() ? "$mutedForeground" : "$primaryForeground"}
                      fontWeight="700"
                      fontSize="$4"
                    >
                      Send Report
                    </TextCore>
                  )}
                </ButtonCore>
              )}
            </YStackCore>
          </ScrollView>
        </KeyboardAvoidingView>
      </Sheet.Frame>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  screenshot: {
    width: "100%",
    height: 180,
    backgroundColor: "#18181b",
  },
  input: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: "top",
  },
});
