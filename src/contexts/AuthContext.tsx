import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/services/mockData';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  demoLogin: (customName?: string, customEmail?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function createMockUser(email: string, fullName: string): User {
  return {
    id: 'usr-demo-' + Math.random().toString(36).substring(2, 9),
    app_metadata: { provider: 'email' },
    user_metadata: { full_name: fullName },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email,
    role: 'authenticated',
    updated_at: new Date().toISOString(),
  } as User;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false,
  });

  useEffect(() => {
    // Check local demo user session first
    const savedDemo = localStorage.getItem('finoracle_demo_user');
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo);
        setState({
          user: parsed,
          session: null,
          loading: false,
          initialized: true,
        });
        return;
      } catch {
        localStorage.removeItem('finoracle_demo_user');
      }
    }

    // Attempt Supabase session if configured
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setState({
            user: session.user,
            session,
            loading: false,
            initialized: true,
          });
        } else {
          setState((prev) => ({ ...prev, loading: false, initialized: true }));
        }
      }).catch(() => {
        setState((prev) => ({ ...prev, loading: false, initialized: true }));
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setState((prev) => ({
          ...prev,
          user: session?.user ?? prev.user,
          session,
          loading: false,
        }));
      });

      return () => subscription.unsubscribe();
    } else {
      setState((prev) => ({ ...prev, loading: false, initialized: true }));
    }
  }, []);

  const demoLogin = useCallback((customName = 'Siddhant Sharma', customEmail = 'siddspr@gmail.com') => {
    const mockUser = createMockUser(customEmail, customName);
    localStorage.setItem('finoracle_demo_user', JSON.stringify(mockUser));
    mockStore.saveProfile({ full_name: customName, email: customEmail });
    setState({
      user: mockUser,
      session: null,
      loading: false,
      initialized: true,
    });
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    setState((prev) => ({ ...prev, loading: true }));
    
    // If Supabase is configured, attempt real registration
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });

        if (error) {
          // If network failure / fetch error, gracefully activate local session
          if (error.message.includes('fetch') || error.message.includes('network') || error.status === 0) {
            demoLogin(fullName, email);
            return { error: null };
          }
          setState((prev) => ({ ...prev, loading: false }));
          return { error: error.message };
        }

        // If auto-logged in, update state
        if (data.session) {
          setState({ user: data.user, session: data.session, loading: false, initialized: true });
        } else {
          // If requires email verification, log in locally for immediate seamless UX
          demoLogin(fullName, email);
        }
        return { error: null };
      } catch (err: any) {
        // Fallback to local session on any fetch exception
        demoLogin(fullName, email);
        return { error: null };
      }
    } else {
      // In demo/offline mode, log in directly!
      demoLogin(fullName, email);
      return { error: null };
    }
  }, [demoLogin]);

  const signIn = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true }));

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('fetch') || error.message.includes('network')) {
            demoLogin(email.split('@')[0], email);
            return { error: null };
          }
          setState((prev) => ({ ...prev, loading: false }));
          return { error: error.message };
        }
        setState({ user: data.user, session: data.session, loading: false, initialized: true });
        return { error: null };
      } catch (err: any) {
        demoLogin(email.split('@')[0], email);
        return { error: null };
      }
    } else {
      demoLogin(email.split('@')[0], email);
      return { error: null };
    }
  }, [demoLogin]);

  const signOut = useCallback(async () => {
    localStorage.removeItem('finoracle_demo_user');
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }
    setState({ user: null, session: null, loading: false, initialized: true });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error?.message ?? null };
    }
    return { error: null };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.updateUser({ password });
      return { error: error?.message ?? null };
    }
    return { error: null };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        demoLogin,
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
