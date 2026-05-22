// Dynamically imported so the SDK doesn't hard-crash if react-native-view-shot
// is not installed in the host app.
export async function captureCurrentScreen(): Promise<string | null> {
  try {
    const { captureScreen } = await import("react-native-view-shot");
    const uri = await captureScreen({ format: "jpg", quality: 0.8 });
    return uri;
  } catch {
    return null;
  }
}

export async function readUriAsBase64(uri: string): Promise<string | null> {
  try {
    const FileSystem = await import("expo-file-system");
    return await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });
  } catch {
    return null;
  }
}
