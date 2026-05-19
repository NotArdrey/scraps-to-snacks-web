import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  DEFAULT_RECIPE_PREFERENCES,
  buildPreferenceTags,
  buildRecipePreferenceText,
  fetchDietTypes,
  fetchAllergyTypes,
  fetchUserDietIds,
  fetchUserAllergies,
  fetchUserRecipePreferences,
  normalizeRecipePreferences,
  saveUserPreferences,
} from '../services/preferences';

export function usePreferences(user) {
  const [dietTypes, setDietTypes] = useState([]);
  const [allergyTypes, setAllergyTypes] = useState([]);
  const [userDiets, setUserDiets] = useState([]);
  const [userAllergies, setUserAllergies] = useState([]);
  const [recipePreferences, setRecipePreferences] = useState(DEFAULT_RECIPE_PREFERENCES);
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
      setRecipePreferences(DEFAULT_RECIPE_PREFERENCES);
      setLoading(false);
      setLoadedUserId(null);
      return;
    }

    if (!silent) {
      setLoading(true);
      setUserDiets([]);
      setUserAllergies([]);
      setRecipePreferences(DEFAULT_RECIPE_PREFERENCES);
    }

    const [diets, allergies, dietIds, allergyPrefs, extendedPreferences] = await Promise.all([
      fetchDietTypes(),
      fetchAllergyTypes(),
      fetchUserDietIds(userId),
      fetchUserAllergies(userId),
      fetchUserRecipePreferences(userId),
    ]);

    if (fetchRequestRef.current !== requestId) return;

    setDietTypes(diets);
    setAllergyTypes(allergies);
    setUserDiets(dietIds);
    setUserAllergies(allergyPrefs);
    setRecipePreferences(extendedPreferences);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_user_profiles', filter: `user_id=eq.${user.id}` }, () => {
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
    const { refresh = true, markOnboarded = true, recipePreferences: nextRecipePreferences } = options;
    await saveUserPreferences(user.id, selectedDietIds, selectedAllergyIds, {
      markOnboarded,
      recipePreferences: nextRecipePreferences,
    });
    if (refresh) await fetchPreferences({ silent: true });
  }, [user, fetchPreferences]);

  const preferencesReady = loadedUserId === (user?.id ?? null);
  const fixedDietNames = preferencesReady ? dietTypes
    .filter(dt => userDiets.includes(dt.id))
    .map(dt => dt.name) : [];
  const normalizedRecipePreferences = normalizeRecipePreferences(preferencesReady ? recipePreferences : DEFAULT_RECIPE_PREFERENCES);
  const activeDietNames = [...fixedDietNames, ...normalizedRecipePreferences.customDiets];
  const fixedAllergyDetails = preferencesReady && !normalizedRecipePreferences.noAllergies ? userAllergies
    .map(pref => {
      const allergy = allergyTypes.find(a => a.id === pref.allergy_type_id);
      if (!allergy) return null;
      const severity = pref.severity || 'medium';
      const crossContact = normalizedRecipePreferences.avoidCrossContamination ? ', avoid cross-contamination' : '';
      return `${allergy.name} (${severity} severity${crossContact})`;
    })
    .filter(Boolean) : [];
  const customAllergyDetails = !normalizedRecipePreferences.noAllergies ? normalizedRecipePreferences.customAllergies
    .map(allergy => `${allergy.name} (${allergy.severity || 'medium'} severity${normalizedRecipePreferences.avoidCrossContamination ? ', avoid cross-contamination' : ''})`) : [];
  const exclusionDetails = normalizedRecipePreferences.exclusions.map(exclusion => `Avoid ingredient: ${exclusion}`);
  const activeAllergyNames = [...fixedAllergyDetails, ...customAllergyDetails, ...exclusionDetails];
  const allergyDisplayNames = [
    ...fixedAllergyDetails.map(item => item.replace(/\s*\(.+\)$/, '')),
    ...customAllergyDetails.map(item => item.replace(/\s*\(.+\)$/, '')),
    ...normalizedRecipePreferences.exclusions.map(exclusion => `No ${exclusion}`),
  ];
  const recipePreferenceText = buildRecipePreferenceText(fixedDietNames, normalizedRecipePreferences);
  const preferenceTags = buildPreferenceTags(fixedDietNames, normalizedRecipePreferences);

  return {
    dietTypes,
    allergyTypes,
    userDiets: preferencesReady ? userDiets : [],
    userAllergies: preferencesReady ? userAllergies : [],
    recipePreferences: normalizedRecipePreferences,
    activeDietNames,
    activeAllergyNames,
    allergyDisplayNames,
    recipePreferenceText,
    preferenceTags,
    loading: loading || loadedUserId !== (user?.id ?? null),
    savePreferences,
    refreshPreferences: fetchPreferences,
  };
}
