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

  // Supabase Realtime: re-fetch when profile or household membership changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`profile-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_user_profiles', filter: `user_id=eq.${user.id}` }, () => {
        fetchProfile();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'household_members', filter: `user_id=eq.${user.id}` }, () => {
        fetchProfile();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchProfile]);

  // Re-fetch when the tab regains focus
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchProfile(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [fetchProfile]);

  return { profile, householdId, loading, refreshProfile: fetchProfile };
}
