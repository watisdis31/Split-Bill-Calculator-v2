import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../services/api";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((res) => {
        if (!cancelled) setUser(res.data.user);
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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(username, password) {
        const res = await api.login(username, password);
        setUser(res.data.user);
      },
      async register(username, password) {
        const res = await api.register(username, password);
        setUser(res.data.user);
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
