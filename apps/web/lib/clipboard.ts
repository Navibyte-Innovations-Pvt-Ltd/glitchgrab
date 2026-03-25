/**
 * Copy text to clipboard with WebView fallback.
 *
 * Tries in order:
 * 1. navigator.clipboard (modern browsers)
 * 2. document.execCommand("copy") (legacy fallback)
 * 3. ReactNativeWebView.postMessage (native bridge in mobile app)
 */
export async function copyToClipboard(text: string): Promise<void> {
  // 1. Modern clipboard API
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // Not available (WebView, insecure context, etc.)
  }

  // 2. Legacy fallback
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return;
  } catch {
    // Also blocked
  }

  // 3. Native WebView bridge
  const win = window as unknown as { ReactNativeWebView?: { postMessage: (msg: string) => void } };
  if (typeof window !== "undefined" && win.ReactNativeWebView) {
    win.ReactNativeWebView.postMessage(
      JSON.stringify({ type: "clipboard-copy", text })
    );
  }
}
