import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { profileService } from '@/services/supabase';
import type { UserProfile } from '@/types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, initialized } = useAuth();
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checkedProfileKey, setCheckedProfileKey] = useState<string | null>(null);
  const isOnboardingRoute = location.pathname === '/onboarding';
  const profileCheckKey = `${user?.id ?? 'anonymous'}:${isOnboardingRoute ? 'onboarding' : 'app'}`;

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setCheckedProfileKey(profileCheckKey);
      return;
    }

    let active = true;

    profileService
      .get()
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch(() => {
        if (active) setProfile(null);
      })
      .finally(() => {
        if (active) setCheckedProfileKey(profileCheckKey);
      });

    return () => {
      active = false;
    };
  }, [user, profileCheckKey]);

  if (!initialized || loading || checkedProfileKey !== profileCheckKey) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-text-secondary text-sm">Loading FinOracle AI...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const needsOnboarding = profile ? !profile.onboarding_completed : false;

  if (needsOnboarding && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!needsOnboarding && isOnboardingRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
