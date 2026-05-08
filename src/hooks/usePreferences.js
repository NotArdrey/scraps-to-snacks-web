import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { fetchDietTypes, fetchAllergyTypes, fetchUserDietIds, fetchUserAllergies, saveUserPreferences } from '../services/preferences';

export function usePreferences(user) {
  const [dietTypes, setDietTypes] = useState([]);
  const [allergyTypes, setAllergyTypes] = useState([]);
  const [userDiets, setUserDiets] = useState([]);
  const [userAllergies, setUserAllergies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadedUserId, setLoadedUserId] = useState(null);
  const fetchRequestRef = useRef(0);

  const fetchPreferences = useCallback(async ({ silent = false } = {}) => {
    const requestId = fetchRequestRef.current + 1;
    fetchRequestRef.current = requestId;
    const userId = user?.id ?? null;

    if (!userId) {
      setDietTypes([]);
      setAllergyTypes([]);
      setUserDiets([]);
      setUserAllergies([]);
      setLoading(false);
      setLoadedUserId(null);
      return;
    }

    if (!silent) {
      setLoading(true);
      setUserDiets([]);
      setUserAllergies([]);
    }

    const [diets, allergies, dietIds, allergyPrefs] = await Promise.all([
      fetchDietTypes(),
      fetchAllergyTypes(),
      fetchUserDietIds(userId),
      fetchUserAllergies(userId),
    ]);

    if (fetchRequestRef.current !== requestId) return;

    setDietTypes(diets);
    setAllergyTypes(allergies);
    setUserDiets(dietIds);
    setUserAllergies(allergyPrefs);
    setLoadedUserId(userId);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    const timeoutId = setTimeout(fetchPreferences, 0);
    return () => clearTimeout(timeoutId);
  }, [fetchPreferences]);

  // Supabase Realtime: re-fetch when user diet/allergy prefs change
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`prefs-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_diet_preferences', filter: `user_id=eq.${user.id}` }, () => {
        fetchPreferences({ silent: true });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_allergy_preferences', filter: `user_id=eq.${user.id}` }, () => {
        fetchPreferences({ silent: true });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchPreferences]);

  // Re-fetch when the tab regains focus
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchPreferences({ silent: true }); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [fetchPreferences]);

  const savePreferences = useCallback(async (selectedDietIds, selectedAllergyIds, options = {}) => {
    if (!user) return;
    const { refresh = true, markOnboarded = true } = options;
    await saveUserPreferences(user.id, selectedDietIds, selectedAllergyIds, { markOnboarded });
    if (refresh) await fetchPreferences({ silent: true });
  }, [user, fetchPreferences]);

  const preferencesReady = loadedUserId === (user?.id ?? null);
  const activeDietNames = preferencesReady ? dietTypes
    .filter(dt => userDiets.includes(dt.id))
    .map(dt => dt.name) : [];

  return {
    dietTypes,
    allergyTypes,
    userDiets: preferencesReady ? userDiets : [],
    userAllergies: preferencesReady ? userAllergies : [],
    activeDietNames,
    loading: loading || loadedUserId !== (user?.id ?? null),
    savePreferences,
    refreshPreferences: fetchPreferences,
  };
}
