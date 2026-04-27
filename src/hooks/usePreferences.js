import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchDietTypes, fetchAllergyTypes, fetchUserDietIds, fetchUserAllergies, saveUserPreferences } from '../services/preferences';

export function usePreferences(user) {
  const [dietTypes, setDietTypes] = useState([]);
  const [allergyTypes, setAllergyTypes] = useState([]);
  const [userDiets, setUserDiets] = useState([]);
  const [userAllergies, setUserAllergies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const [diets, allergies, dietIds, allergyPrefs] = await Promise.all([
      fetchDietTypes(),
      fetchAllergyTypes(),
      fetchUserDietIds(user.id),
      fetchUserAllergies(user.id),
    ]);

    setDietTypes(diets);
    setAllergyTypes(allergies);
    setUserDiets(dietIds);
    setUserAllergies(allergyPrefs);
    setLoading(false);
  }, [user]);

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
        fetchPreferences();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_allergy_preferences', filter: `user_id=eq.${user.id}` }, () => {
        fetchPreferences();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchPreferences]);

  // Re-fetch when the tab regains focus
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchPreferences(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [fetchPreferences]);

  const savePreferences = useCallback(async (selectedDietIds, selectedAllergyIds, options = {}) => {
    if (!user) return;
    const { refresh = true, markOnboarded = true } = options;
    await saveUserPreferences(user.id, selectedDietIds, selectedAllergyIds, { markOnboarded });
    if (refresh) await fetchPreferences();
  }, [user, fetchPreferences]);

  const activeDietNames = dietTypes
    .filter(dt => userDiets.includes(dt.id))
    .map(dt => dt.name);

  return {
    dietTypes,
    allergyTypes,
    userDiets,
    userAllergies,
    activeDietNames,
    loading,
    savePreferences,
    refreshPreferences: fetchPreferences,
  };
}
