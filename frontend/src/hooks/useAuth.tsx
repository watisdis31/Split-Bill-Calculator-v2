import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, SESSION_EXPIRED_EVENT } from "../services/api";
import { ApiError } from "../types";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function restoreSession() {
  const res = await api.me();
  return res.data.user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    restoreSession()
      .then((nextUser) => {
        if (!cancelled) setUser(nextUser);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onSessionExpired() {
      setUser(null);
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(username, password) {
        await api.login(username, password);
        try {
          setUser(await restoreSession());
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            throw new Error("Could not start a session. Please try again.");
          }
          throw err;
        }
      },
      async register(username, password) {
        await api.register(username, password);
        try {
          setUser(await restoreSession());
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            throw new Error("Could not start a session. Please try again.");
          }
          throw err;
        }
      },
      async logout() {
        try {
          await api.logout();
        } finally {
          setUser(null);
        }
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong.") {
  let message = fallback;
  if (error instanceof ApiError) message = error.message || fallback;
  else if (error instanceof Error) message = error.message || fallback;

  const friendly: Record<string, string> = {
    Unauthorized: "You are not authorized to do that.",
    Forbidden: "You are not authorized to do that.",
    "Username is already taken": "Username already exists.",
    "Resource already exists": "That record already exists.",
    "An unexpected error occurred": "Something went wrong. Please try again.",
    "Unexpected backend error": "Something went wrong. Please try again.",
  };

  if (friendly[message]) return friendly[message];
  if (/duplicate key|unique constraint|violates|ECONNREFUSED|syntax error|SQLSTATE/i.test(message)) {
    return fallback;
  }
  return message;
}
