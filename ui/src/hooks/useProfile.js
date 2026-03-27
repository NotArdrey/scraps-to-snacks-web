import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useProfile(user) {
  const [profile, setProfile] = useState(null);
  const [householdId, setHouseholdId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setHouseholdId(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [profileRes, membershipRes] = await Promise.all([
      supabase
        .from('app_user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1)
        .single(),
    ]);

    setProfile(profileRes.data);
    setHouseholdId(membershipRes.data?.household_id ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, householdId, loading, refreshProfile: fetchProfile };
}
