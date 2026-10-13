import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CurrentUser, getCurrentUser } from "../services/api";

type CurrentUserState = {
  user: CurrentUser | null;
  loading: boolean;
  error: string;
  refreshUser: () => Promise<void>;
  clearUser: () => void;
};

const CurrentUserContext = createContext<CurrentUserState | undefined>(undefined);

export const CurrentUserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("bi_token")));
  const [error, setError] = useState("");

  const clearUser = useCallback(() => {
    setUser(null);
    setLoading(false);
    setError("");
  }, []);

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem("bi_token")) {
      clearUser();
      return;
    }
    setLoading(true);
    setError("");
    try {
      setUser(await getCurrentUser());
    } catch (requestError: any) {
      setUser(null);
      setError(requestError?.response?.data?.detail || requestError?.message || "Unable to load your account.");
    } finally {
      setLoading(false);
    }
  }, [clearUser]);

  useEffect(() => {
    refreshUser();
    const onAuthChange = () => refreshUser();
    window.addEventListener("bi-auth-changed", onAuthChange);
    return () => window.removeEventListener("bi-auth-changed", onAuthChange);
  }, [refreshUser]);

  return <CurrentUserContext.Provider value={{ user, loading, error, refreshUser, clearUser }}>{children}</CurrentUserContext.Provider>;
};

export const useCurrentUser = (): CurrentUserState => {
  const context = useContext(CurrentUserContext);
  if (!context) throw new Error("useCurrentUser must be used within CurrentUserProvider");
  return context;
};
