import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useProfile(user) {
  const [profile, setProfile] = useState(null);
  const [householdId, setHouseholdId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState(null);
  const fetchRequestRef = useRef(0);

  const fetchProfile = useCallback(async () => {
    const requestId = fetchRequestRef.current + 1;
    fetchRequestRef.current = requestId;
    const userId = user?.id ?? null;

    if (!userId) {
      setProfile(null);
      setHouseholdId(null);
      setLoadedUserId(null);
      setLoading(false);
      return null;
    }

    setLoading(true);

    const [profileRes, membershipRes] = await Promise.all([
      supabase
        .from('app_user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', userId)
        .limit(1)
        .single(),
    ]);

    if (fetchRequestRef.current !== requestId) return profileRes.data ?? null;

    setProfile(profileRes.data);
    setHouseholdId(membershipRes.data?.household_id ?? null);
    setLoadedUserId(userId);
    setLoading(false);
    return profileRes.data;
  }, [user?.id]);

  useEffect(() => {
    const timeoutId = setTimeout(fetchProfile, 0);
    return () => clearTimeout(timeoutId);
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

  return {
    profile,
    householdId,
    loading: loading || loadedUserId !== (user?.id ?? null),
    refreshProfile: fetchProfile,
  };
}
