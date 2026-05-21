import axios from "axios";
import Constants from "expo-constants";
import { SecureStorage } from "./secure-store";

interface ExpoExtra {
  APP_ENV?: string;
  BASE_URL?: string;
  hostUri?: string;
}

interface MobileSession {
  sessionToken: string;
  user: { name: string; email: string; image: string };
  success: boolean;
  error?: string;
}

interface Manifest2 {
  extra?: { expoGo?: { debuggerHost?: string } };
}

function getBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as ExpoExtra | undefined;
  if (extra?.APP_ENV === "production") return "https://glitchgrab.dev";
  if (extra?.BASE_URL) return extra.BASE_URL;

  const manifest2 = (Constants as unknown as { manifest2?: Manifest2 }).manifest2;
  const debuggerHost: string | undefined =
    Constants.expoConfig?.hostUri ??
    manifest2?.extra?.expoGo?.debuggerHost;

  const host = debuggerHost?.split(":")[0];
  if (host) return `http://${host}:3000`;

  return "http://localhost:3000";
}

export const BASE_URL = getBaseUrl();

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

const logoutListeners: Array<() => void> = [];
export const apiAuthEvents = {
  emitLogout: () => { logoutListeners.forEach((fn) => fn()); },
  onLogout: (fn: () => void) => {
    logoutListeners.push(fn);
    return () => {
      const i = logoutListeners.indexOf(fn);
      if (i !== -1) logoutListeners.splice(i, 1);
    };
  },
};

api.interceptors.response.use(
  (res) => res,
  (err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      apiAuthEvents.emitLogout();
    }
    return Promise.reject(err instanceof Error ? err : new Error(String(err)));
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

  const data = await res.json() as MobileSession;
  if (!data.success || !data.sessionToken) {
    throw new Error(data.error ?? "Invalid response from server");
  }

  return { sessionToken: data.sessionToken, user: data.user };
}
