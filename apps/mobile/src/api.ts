import Constants from "expo-constants";

// APP_ENV is set via extra in app.json at build time
// "production" → glitchgrab.dev | "development" → local dev server
function getBaseUrl(): string {
  const appEnv = Constants.expoConfig?.extra?.APP_ENV;

  if (appEnv === "production") return "https://glitchgrab.dev";

  // Dev: use the Expo dev server host (same network as the dev machine)
  const debuggerHost =
    Constants.expoConfig?.hostUri ??
    Constants.manifest2?.extra?.expoGo?.debuggerHost;
  const host = debuggerHost?.split(":")[0];

  if (host) return `http://${host}:3000`;

  return "http://localhost:3000";
}

const BASE_URL = getBaseUrl();

export { BASE_URL };

/**
 * Exchange GitHub OAuth code for a Glitchgrab session.
 * Sends the code to our backend which handles the full exchange securely.
 */
export async function exchangeCodeForSession(
  code: string,
  codeVerifier?: string
): Promise<{
  sessionToken: string;
  user: { name: string; email: string; image: string };
}> {
  const res = await fetch(`${BASE_URL}/api/auth/mobile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, code_verifier: codeVerifier }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "Unknown error");
    throw new Error(`Auth failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  if (!data.success || !data.sessionToken) {
    throw new Error(data.error || "Invalid response from server");
  }

  return {
    sessionToken: data.sessionToken,
    user: data.user,
  };
}
