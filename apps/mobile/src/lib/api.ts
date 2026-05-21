import axios from "axios";
import Constants from "expo-constants";
import { SecureStorage } from "./secure-store";

function getBaseUrl(): string {
  const appEnv = Constants.expoConfig?.extra?.APP_ENV;
  if (appEnv === "production") return "https://glitchgrab.dev";

  const debuggerHost =
    Constants.expoConfig?.hostUri ??
    // @ts-expect-error manifest2 is not typed
    Constants.manifest2?.extra?.expoGo?.debuggerHost;
  const host = debuggerHost?.split(":")[0];
  if (host) return `http://${host}:3000`;

  return "http://localhost:3000";
}

export const BASE_URL = getBaseUrl();

// Cookie name matches what /api/auth/mobile sets
const SESSION_COOKIE_NAME = "authjs.session-token";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStorage.getSessionToken();
  if (token) {
    // Send session JWT as cookie — NextAuth's auth() reads it server-side
    config.headers["Cookie"] = `${SESSION_COOKIE_NAME}=${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      // Will be handled by AuthContext
      import("../contexts/AuthContext").then(({ authEvents }) => {
        authEvents.emitLogout();
      }).catch(() => null);
    }
    return Promise.reject(err);
  }
);

export async function exchangeCodeForSession(
  code: string,
  codeVerifier?: string
): Promise<{ sessionToken: string; user: { name: string; email: string; image: string } }> {
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

  return { sessionToken: data.sessionToken, user: data.user };
}
