"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getApiUrl } from "./trpc";
import type { Role } from "./types";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AuthState {
  token: string | null;
  user: SessionUser | null;
  isLoading: boolean;
}

interface RegisterInput {
  companyName: string;
  industryLabel: string;
  siteTermLabel?: string;
  productionUnitLabel?: string;
  firstSiteName?: string;
  firstSiteProductionMode?: "SIMPLE" | "BATCH_WEIGHBRIDGE";
  productionEnabled?: boolean;
  siteOperationsEnabled?: boolean;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

export const TOKEN_KEY = "pinta_token";
const USER_KEY = "pinta_user";

const AuthContext = createContext<AuthContextValue | null>(null);

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, user: null, isLoading: true });

  useEffect(() => {
    // One-time hydration of a browser-only API (localStorage) after mount —
    // this can't be read during SSR/first render, so an effect is required.
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    if (token && userJson) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ token, user: JSON.parse(userJson) as SessionUser, isLoading: false });
    } else {
      setState({ token: null, user: null, isLoading: false });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${getApiUrl()}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await parseErrorMessage(res));
    const data = (await res.json()) as { token: string; user: SessionUser };
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setState({ token: data.token, user: data.user, isLoading: false });
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await fetch(`${getApiUrl()}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await parseErrorMessage(res));
    const data = (await res.json()) as { token: string; user: SessionUser };
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setState({ token: data.token, user: data.user, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setState({ token: null, user: null, isLoading: false });
  }, []);

  const value = useMemo(() => ({ ...state, login, register, logout }), [state, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
