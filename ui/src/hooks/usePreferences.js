import { useState, useEffect, useCallback } from 'react';
import { fetchDietTypes, fetchAllergyTypes, fetchUserDietIds, fetchUserAllergies, saveUserPreferences } from '../services/preferencesService';

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
    fetchPreferences();
  }, [fetchPreferences]);

  const savePreferences = useCallback(async (selectedDietIds, selectedAllergyIds) => {
    if (!user) return;
    await saveUserPreferences(user.id, selectedDietIds, selectedAllergyIds);
    await fetchPreferences();
  }, [user, fetchPreferences]);

  const activeDietName = (() => {
    if (userDiets.length === 0) return 'None';
    const matched = dietTypes.find(dt => dt.id === userDiets[0]);
    return matched ? matched.name : 'None';
  })();

  return {
    dietTypes,
    allergyTypes,
    userDiets,
    userAllergies,
    activeDietName,
    loading,
    savePreferences,
    refreshPreferences: fetchPreferences,
  };
}
