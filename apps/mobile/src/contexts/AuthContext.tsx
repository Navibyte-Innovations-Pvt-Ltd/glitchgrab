import type React from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { SecureStorage } from "@/lib/secure-store";

interface AuthUser {
  name: string;
  email: string;
  image: string;
}

interface AuthState {
  sessionToken: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (sessionToken: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Simple event emitter for 401 logout
const logoutListeners: Array<() => void> = [];
export const authEvents = {
  emitLogout: () => { logoutListeners.forEach((fn) => fn()); },
  onLogout: (fn: () => void) => {
    logoutListeners.push(fn);
    return () => {
      const i = logoutListeners.indexOf(fn);
      if (i !== -1) logoutListeners.splice(i, 1);
    };
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    sessionToken: null,
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    void loadStoredAuth();
  }, []);

  const stableLogout = useCallback(async () => {
    await SecureStorage.clearAll();
    setState({ sessionToken: null, user: null, isLoading: false, isAuthenticated: false });
  }, []);

  useEffect(() => {
    return authEvents.onLogout(stableLogout);
  }, [stableLogout]);

  async function loadStoredAuth() {
    try {
      const [token, user] = await Promise.all([
        SecureStorage.getSessionToken(),
        SecureStorage.getUser(),
      ]);
      setState({
        sessionToken: token,
        user,
        isLoading: false,
        isAuthenticated: !!token && !!user,
      });
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  async function login(sessionToken: string, user: AuthUser) {
    await SecureStorage.setSessionToken(sessionToken);
    await SecureStorage.setUser(user);
    setState({ sessionToken, user, isLoading: false, isAuthenticated: true });
  }

  async function logout() {
    await SecureStorage.clearAll();
    setState({ sessionToken: null, user: null, isLoading: false, isAuthenticated: false });
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
