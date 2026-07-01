'use client';

/**
 * MODULE 1 (frontend) — role-aware global auth state.
 *
 * The entire app is wrapped in <AuthProvider>. Components read `role` and the
 * `isDealer` helper to decide which UI to render. This is the single source of
 * truth for conditional rendering between the standard shop and the extended
 * Dealer Portal.
 *
 * NOTE: role gating here is a UX convenience only. The backend re-checks the
 * role on every protected route (see middleware/auth.ts) — the client can
 * never grant itself dealer access just by flipping state.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { AuthUser, RoleName } from '@/lib/types';

interface AuthContextValue {
  user: AuthUser | null;
  role: RoleName | null;
  isDealer: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'scanbolt_token';
const USER_KEY = 'scanbolt_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage on boot so a refresh keeps the session.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(USER_KEY);
      if (raw) setUser(JSON.parse(raw) as AuthUser);
    } catch {
      /* ignore malformed storage */
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: u, token } = await api.login(email, password);
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  // "Highest privilege wins" — a user holding the dealer role is treated as a dealer.
  const role: RoleName | null = useMemo(() => {
    if (!user) return null;
    return user.roles.includes('dealer') ? 'dealer' : 'standard_buyer';
  }, [user]);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      role,
      isDealer: role === 'dealer',
      isAuthenticated: Boolean(user),
      loading,
      login,
      logout,
    }),
    [user, role, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
