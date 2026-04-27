import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';
import { useSubscription } from './hooks/useSubscription';
import { AppContext } from './AppContextValue';

export const AppProvider = ({ children }) => {
  const auth = useAuth();
  const { profile, householdId, loading: profileLoading, refreshProfile } = useProfile(auth.user);
  const { subscription, hasActiveSubscription, loading: subLoading, refreshSubscription } = useSubscription(auth.user);

  const isOnboarded = !!profile?.onboarding_completed_at;
  const isAdmin = profile?.role === 'admin';

  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <AppContext.Provider value={{
      ...auth,
      profile,
      householdId,
      profileLoading,
      refreshProfile,
      isOnboarded,
      isAdmin,
      subscription,
      hasActiveSubscription,
      subLoading,
      refreshSubscription,
      theme,
      toggleTheme,
    }}>
      {children}
    </AppContext.Provider>
  );
};
