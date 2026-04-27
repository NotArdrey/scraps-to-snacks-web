import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useSubscription(user) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState(null);
  const fetchRequestRef = useRef(0);

  const fetchSubscription = useCallback(async () => {
    const requestId = fetchRequestRef.current + 1;
    fetchRequestRef.current = requestId;
    const userId = user?.id ?? null;

    if (!userId) {
      setSubscription(null);
      setLoadedUserId(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*, subscription_plans(*)')
      .eq('user_id', userId)
      .in('status', ['trialing', 'active'])
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchRequestRef.current !== requestId) return data ?? null;

    if (error) {
      console.error('Failed to load subscription', error);
    }

    setSubscription(error ? null : data);
    setLoadedUserId(userId);
    setLoading(false);
    return error ? null : data;
  }, [user?.id]);

  useEffect(() => {
    const timeoutId = setTimeout(fetchSubscription, 0);
    return () => clearTimeout(timeoutId);
  }, [fetchSubscription]);

  // Supabase Realtime: re-fetch when subscription status changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`subscription-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_subscriptions', filter: `user_id=eq.${user.id}` }, () => {
        fetchSubscription();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchSubscription]);

  // Re-fetch when the tab regains focus
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchSubscription(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [fetchSubscription]);

  return {
    subscription,
    hasActiveSubscription: !!subscription,
    loading: loading || loadedUserId !== (user?.id ?? null),
    refreshSubscription: fetchSubscription,
  };
}
