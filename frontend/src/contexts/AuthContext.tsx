import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, clearAuthToken, getAuthToken, setAuthToken } from '@/services/api';
import type { UserProfile } from '@/types';

export interface AuthUser extends UserProfile {
  user_metadata: {
    full_name: string;
  };
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  completeOnboarding: (payload: {
    occupation: string;
    income_mode: string;
    income_value: number;
    income_type?: string;
    currency: string;
    primary_goal?: string;
  }) => Promise<AuthUser>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAuthUser(profile: UserProfile): AuthUser {
  return {
    ...profile,
    user_metadata: {
      full_name: profile.full_name || '',
    },
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: getAuthToken(),
    loading: true,
    initialized: false,
  });

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    const token = getAuthToken();
    if (!token) {
      setState({ user: null, token: null, loading: false, initialized: true });
      return null;
    }
    try {
      const { user: profile } = await authApi.me();
      const hydrated = toAuthUser(profile);
      setState({ user: hydrated, token, loading: false, initialized: true });
      return hydrated;
    } catch {
      clearAuthToken();
      setState({ user: null, token: null, loading: false, initialized: true });
      return null;
    }
  }, []);

  useEffect(() => {
    // Always purge any legacy demo user artifact on app boot
    localStorage.removeItem('finoracle_demo_user');
    refreshUser();
  }, [refreshUser]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const res = await authApi.register({ full_name: fullName, email, password });
      setAuthToken(res.access_token);
      const hydrated = toAuthUser(res.user);
      setState({
        user: hydrated,
        token: res.access_token,
        loading: false,
        initialized: true,
      });
      return { error: null };
    } catch (err: unknown) {
      setState((prev) => ({ ...prev, loading: false }));
      return { error: err instanceof Error ? err.message : 'Unable to create account.' };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const res = await authApi.login({ email, password });
      setAuthToken(res.access_token);
      const hydrated = toAuthUser(res.user);
      setState({
        user: hydrated,
        token: res.access_token,
        loading: false,
        initialized: true,
      });
      return { error: null };
    } catch (err: unknown) {
      setState((prev) => ({ ...prev, loading: false }));
      return { error: err instanceof Error ? err.message : 'Invalid email or password.' };
    }
  }, []);

  const completeOnboarding = useCallback(
    async (payload: {
      occupation: string;
      income_mode: string;
      income_value: number;
      income_type?: string;
      currency: string;
      primary_goal?: string;
    }) => {
      const res = await authApi.completeOnboarding(payload);
      const hydrated = toAuthUser(res.user);
      setState((prev) => ({
        ...prev,
        user: hydrated,
        loading: false,
        initialized: true,
      }));
      return hydrated;
    },
    []
  );

  const signOut = useCallback(async () => {
    clearAuthToken();
    setState({ user: null, token: null, loading: false, initialized: true });
  }, []);

  const resetPassword = useCallback(async (_email: string) => {
    return {
      error: 'Password reset emails are disabled in local SQLite mode. Update your password in Settings while signed in.',
    };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    try {
      await authApi.updatePassword(password);
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Failed to update password.' };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signOut,
        refreshUser,
        completeOnboarding,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
