import React, { createContext } from 'react';
import { useAuth } from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';
import { useSubscription } from './hooks/useSubscription';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const auth = useAuth();
  const { profile, householdId, loading: profileLoading, refreshProfile } = useProfile(auth.user);
  const { subscription, hasActiveSubscription, loading: subLoading, refreshSubscription } = useSubscription(auth.user);

  const isOnboarded = !!profile?.onboarding_completed_at;

  return (
    <AppContext.Provider value={{
      ...auth,
      profile,
      householdId,
      profileLoading,
      refreshProfile,
      isOnboarded,
      subscription,
      hasActiveSubscription,
      subLoading,
      refreshSubscription,
    }}>
      {children}
    </AppContext.Provider>
  );
};
