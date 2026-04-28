"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { readJsonOrThrow } from "@/lib/client-fetch";

type AuthSessionContextValue = {
  isAdmin: boolean;
  loading: boolean;
  refreshSession: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const payload = await readJsonOrThrow<{ isAdmin: boolean }>(response);
      setIsAdmin(payload.isAdmin);
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  const value = useMemo(
    () => ({
      isAdmin,
      loading,
      refreshSession
    }),
    [isAdmin, loading]
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error("useAuthSession must be used within AuthSessionProvider.");
  }

  return context;
}
