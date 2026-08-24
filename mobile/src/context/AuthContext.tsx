import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { User } from "../types";
import { authApi } from "../api/auth";
import { getToken, setToken, loadStoredToken, setUnauthorizedHandler } from "../api/client";

interface AuthContextValue {
  user: User | null;
  /** True until the stored token has been read and validated at startup. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string, acceptPrivacy?: boolean) => Promise<void>;
  loginWithApple: (identityToken: string, fullName?: string, acceptPrivacy?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return;
    }
    try {
      setUser(await authApi.me());
    } catch {
      await setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // A 401 anywhere in the app means the session is gone - drop to signed out.
    setUnauthorizedHandler(() => setUser(null));

    (async () => {
      await loadStoredToken();
      await refreshUser();
      setLoading(false);
    })();

    return () => setUnauthorizedHandler(null);
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const { token, user: u } = await authApi.login({ email, password });
    await setToken(token);
    setUser(u);
  };

  const signup = async (name: string, email: string, password: string) => {
    const { token, user: u } = await authApi.signup({ name, email, password, acceptPrivacy: true });
    await setToken(token);
    setUser(u);
  };

  const loginWithGoogle = async (idToken: string, acceptPrivacy?: boolean) => {
    const { token, user: u } = await authApi.google(idToken, acceptPrivacy);
    await setToken(token);
    setUser(u);
  };

  const loginWithApple = async (identityToken: string, fullName?: string, acceptPrivacy?: boolean) => {
    const { token, user: u } = await authApi.apple(identityToken, fullName, acceptPrivacy);
    await setToken(token);
    setUser(u);
  };

  const logout = async () => {
    await setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, loginWithGoogle, loginWithApple, logout, refreshUser, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
