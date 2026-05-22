import * as SecureStore from "expo-secure-store";

const SESSION_TOKEN_KEY = "session_token";
const USER_KEY = "gg_user";

export const SecureStorage = {
  async getSessionToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setSessionToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
  },

  async getUser(): Promise<{ name: string; email: string; image: string } | null> {
    try {
      const raw = await SecureStore.getItemAsync(USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as { name: string; email: string; image: string };
    } catch {
      return null;
    }
  },

  async setUser(user: { name: string; email: string; image: string }): Promise<void> {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(SESSION_TOKEN_KEY).catch(() => null),
      SecureStore.deleteItemAsync(USER_KEY).catch(() => null),
    ]);
  },
};
