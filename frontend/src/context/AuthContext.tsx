import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "../types";
import { authApi } from "../api/auth";
import { getToken, setToken } from "../api/client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithApple: (identityToken: string, fullName?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return;
    }
    try {
      const u = await authApi.me();
      setUser(u);
    } catch {
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user: u } = await authApi.login({ email, password });
    setToken(token);
    setUser(u);
  };

  const signup = async (name: string, email: string, password: string) => {
    const { token, user: u } = await authApi.signup({ name, email, password });
    setToken(token);
    setUser(u);
  };

  const loginWithGoogle = async (idToken: string) => {
    const { token, user: u } = await authApi.google(idToken);
    setToken(token);
    setUser(u);
  };

  const loginWithApple = async (identityToken: string, fullName?: string) => {
    const { token, user: u } = await authApi.apple(identityToken, fullName);
    setToken(token);
    setUser(u);
  };

  const logout = () => {
    setToken(null);
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
