import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import type { GlitchgrabConfig } from "./context";
import { submitReport } from "./lib/api";
import { readUriAsBase64 } from "./lib/capture";

type ReportType = "BUG" | "FEATURE_REQUEST" | "QUESTION" | "OTHER";

const TYPE_OPTIONS: Array<{ type: ReportType; label: string; emoji: string }> = [
  { type: "BUG", label: "Bug", emoji: "🐛" },
  { type: "FEATURE_REQUEST", label: "Feature", emoji: "⭐" },
  { type: "QUESTION", label: "Question", emoji: "❓" },
  { type: "OTHER", label: "Other", emoji: "💬" },
];

interface BugReportSheetProps {
  visible: boolean;
  screenshotUri: string | null;
  config: GlitchgrabConfig;
  onClose: () => void;
}

export function BugReportSheet({ visible, screenshotUri, config, onClose }: BugReportSheetProps) {
  const [type, setType] = useState<ReportType>("BUG");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setDescription("");
    setType("BUG");
    setSubmitted(false);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!description.trim() || submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      let screenshotBase64: string | undefined;
      if (screenshotUri) {
        screenshotBase64 = (await readUriAsBase64(screenshotUri)) ?? undefined;
      }

      await submitReport(config.token, {
        description: description.trim(),
        type,
        source: "SDK_USER_REPORT",
        reporterPrimaryKey: config.user?.id ?? "anonymous",
        reporterName: config.user?.name ?? "Anonymous",
        reporterEmail: config.user?.email,
        screenshotBase64,
      }, config.baseUrl);

      setSubmitted(true);
      setTimeout(() => { handleClose(); }, 1500);
    } catch {
      setError("Could not send the report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = description.trim().length > 0 && !submitting;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Report a Bug</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Screenshot preview */}
            {screenshotUri ? (
              <View style={styles.screenshotContainer}>
                <Image
                  source={{ uri: screenshotUri }}
                  style={styles.screenshot}
                  resizeMode="contain"
                />
              </View>
            ) : null}

            {/* Type selector */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TYPE</Text>
              <View style={styles.typeRow}>
                {TYPE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.type}
                    style={[styles.typeBtn, type === opt.type && styles.typeBtnActive]}
                    onPress={() => { setType(opt.type); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.typeEmoji}>{opt.emoji}</Text>
                    <Text style={[styles.typeLabel, type === opt.type && styles.typeLabelActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DESCRIPTION</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe the bug..."
                  placeholderTextColor="#71717a"
                  multiline
                  numberOfLines={5}
                  style={styles.input}
                  autoFocus
                />
              </View>
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Submit */}
            {submitted ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>✓ Report sent!</Text>
                <Text style={styles.successSub}>GitHub issue created</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                onPress={() => { void handleSubmit(); }}
                disabled={!canSubmit}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#09090b" />
                ) : (
                  <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>
                    Send Report
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* Branding */}
            <Text style={styles.branding}>Powered by Glitchgrab</Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const PRIMARY = "#22d3ee";
const BG = "#09090b";
const BG_SECONDARY = "#18181b";
const BORDER = "#2c2c2e";
const TEXT = "#fafafa";
const MUTED = "#71717a";
const SUCCESS = "#22c55e";
const ERROR = "#ef4444";

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: BG, paddingTop: 12 },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: BORDER,
    alignSelf: "center",
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { color: TEXT, fontSize: 20, fontWeight: "700" },
  closeBtn: { color: MUTED, fontSize: 18 },
  content: { padding: 16, gap: 20, paddingBottom: 48 },
  screenshotContainer: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    overflow: "hidden",
  },
  screenshot: { width: "100%", height: 180, backgroundColor: BG_SECONDARY },
  section: { gap: 8 },
  sectionLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
  },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeBtn: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BG_SECONDARY,
  },
  typeBtnActive: {
    borderColor: PRIMARY,
    backgroundColor: "rgba(34, 211, 238, 0.10)",
  },
  typeEmoji: { fontSize: 14 },
  typeLabel: { color: MUTED, fontSize: 13, fontWeight: "600" },
  typeLabelActive: { color: PRIMARY },
  inputContainer: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    backgroundColor: BG_SECONDARY,
    padding: 12,
  },
  input: {
    color: TEXT,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: "top",
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderRadius: 8,
    padding: 12,
  },
  errorText: { color: ERROR, fontSize: 14 },
  successBox: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  successText: { color: SUCCESS, fontSize: 16, fontWeight: "700" },
  successSub: { color: MUTED, fontSize: 13 },
  submitBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitBtnDisabled: { backgroundColor: BG_SECONDARY },
  submitText: { color: BG, fontSize: 16, fontWeight: "700" },
  submitTextDisabled: { color: MUTED },
  branding: {
    color: MUTED,
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
});
