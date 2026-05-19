import { supabase } from '../lib/supabase';

export const DEFAULT_RECIPE_PREFERENCES = {
  customDiets: [],
  customAllergies: [],
  noAllergies: false,
  avoidCrossContamination: false,
  exclusions: [],
  cuisines: [],
  favoriteIngredients: [],
  dislikedIngredients: [],
  mealTypes: [],
  cookingTime: 'any',
  budget: 'any',
  skillLevel: 'any',
  servings: 2,
  calorieTarget: '',
  proteinTarget: '',
  carbTarget: '',
  notes: '',
};

const SEVERITY_LEVELS = new Set(['mild', 'medium', 'severe']);
const SELECT_LEVELS = new Set(['any', '15-min', '30-min', '45-min', '60-min-plus', 'budget', 'mid', 'flexible', 'premium', 'beginner', 'intermediate', 'advanced']);

function cleanText(value, maxLength = 80) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : '';
}

function cleanTextList(value, maxItems = 20, maxLength = 80) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .map(item => cleanText(item, maxLength))
    .filter(Boolean)
    .filter(item => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxItems);
}

function normalizeSeverity(value, fallback = 'medium') {
  return SEVERITY_LEVELS.has(value) ? value : fallback;
}

function normalizeSelectValue(value, fallback = 'any') {
  return SELECT_LEVELS.has(value) ? value : fallback;
}

export function normalizeRecipePreferences(value = {}) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const noAllergies = Boolean(input.noAllergies);
  const customAllergies = Array.isArray(input.customAllergies)
    ? input.customAllergies
        .map(item => {
          if (typeof item === 'string') {
            const name = cleanText(item);
            return name ? { name, severity: 'medium' } : null;
          }
          const name = cleanText(item?.name);
          if (!name) return null;
          return { name, severity: normalizeSeverity(item?.severity) };
        })
        .filter(Boolean)
        .slice(0, 20)
    : [];

  const servings = Number(input.servings);

  return {
    ...DEFAULT_RECIPE_PREFERENCES,
    customDiets: cleanTextList(input.customDiets, 20),
    customAllergies: noAllergies ? [] : customAllergies,
    noAllergies,
    avoidCrossContamination: noAllergies ? false : Boolean(input.avoidCrossContamination),
    exclusions: cleanTextList(input.exclusions, 30),
    cuisines: cleanTextList(input.cuisines, 20),
    favoriteIngredients: cleanTextList(input.favoriteIngredients, 30),
    dislikedIngredients: cleanTextList(input.dislikedIngredients, 30),
    mealTypes: cleanTextList(input.mealTypes, 12),
    cookingTime: normalizeSelectValue(input.cookingTime),
    budget: normalizeSelectValue(input.budget),
    skillLevel: normalizeSelectValue(input.skillLevel),
    servings: Number.isFinite(servings) ? Math.min(20, Math.max(1, Math.round(servings))) : DEFAULT_RECIPE_PREFERENCES.servings,
    calorieTarget: cleanText(input.calorieTarget, 24),
    proteinTarget: cleanText(input.proteinTarget, 24),
    carbTarget: cleanText(input.carbTarget, 24),
    notes: cleanText(input.notes, 500),
  };
}

function normalizeAllergyPreferences(selectedAllergies) {
  if (!Array.isArray(selectedAllergies)) return [];
  return selectedAllergies
    .map(item => {
      if (typeof item === 'string') {
        return { allergy_type_id: item, severity: 'medium' };
      }
      const allergyTypeId = item?.allergy_type_id || item?.id;
      if (!allergyTypeId) return null;
      return {
        allergy_type_id: allergyTypeId,
        severity: normalizeSeverity(item?.severity),
      };
    })
    .filter(Boolean);
}

function throwIfError(result, fallbackMessage) {
  if (result?.error) {
    throw new Error(result.error.message || fallbackMessage);
  }
}

export async function fetchDietTypes() {
  const { data } = await supabase.from('diet_types').select('*').order('name');
  return data || [];
}

export async function fetchAllergyTypes() {
  const { data } = await supabase.from('allergy_types').select('*').order('name');
  return data || [];
}

export async function fetchUserDietIds(userId) {
  const { data } = await supabase.from('user_diet_preferences').select('diet_type_id').eq('user_id', userId);
  return (data || []).map(d => d.diet_type_id);
}

export async function fetchUserAllergies(userId) {
  const { data } = await supabase.from('user_allergy_preferences').select('allergy_type_id, severity').eq('user_id', userId);
  return data || [];
}

export async function fetchUserRecipePreferences(userId) {
  const { data, error } = await supabase
    .from('app_user_profiles')
    .select('recipe_preferences')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.warn('Unable to load extended recipe preferences; using defaults.', error);
    return normalizeRecipePreferences();
  }

  return normalizeRecipePreferences(data?.recipe_preferences);
}

export function buildRecipePreferenceText(dietNames = [], preferences = DEFAULT_RECIPE_PREFERENCES) {
  const prefs = normalizeRecipePreferences(preferences);
  const parts = [];
  const dietList = [...dietNames, ...prefs.customDiets].filter(Boolean);

  if (dietList.length > 0) parts.push(`Diet/preferences: ${dietList.join(', ')}`);
  if (prefs.cuisines.length > 0) parts.push(`Preferred cuisines: ${prefs.cuisines.join(', ')}`);
  if (prefs.favoriteIngredients.length > 0) parts.push(`Favorite ingredients to prioritize when available: ${prefs.favoriteIngredients.join(', ')}`);
  if (prefs.dislikedIngredients.length > 0) parts.push(`Disliked ingredients to avoid when possible: ${prefs.dislikedIngredients.join(', ')}`);
  if (prefs.mealTypes.length > 0) parts.push(`Meal types: ${prefs.mealTypes.join(', ')}`);
  if (prefs.cookingTime !== 'any') parts.push(`Cooking time target: ${prefs.cookingTime}`);
  if (prefs.budget !== 'any') parts.push(`Budget preference: ${prefs.budget}`);
  if (prefs.skillLevel !== 'any') parts.push(`Cooking skill level: ${prefs.skillLevel}`);
  if (prefs.servings) parts.push(`Servings/household size: ${prefs.servings}`);
  if (prefs.calorieTarget) parts.push(`Calorie target: ${prefs.calorieTarget}`);
  if (prefs.proteinTarget) parts.push(`Protein target: ${prefs.proteinTarget}`);
  if (prefs.carbTarget) parts.push(`Carb target: ${prefs.carbTarget}`);
  if (prefs.notes) parts.push(`Extra notes: ${prefs.notes}`);

  return parts.length > 0 ? parts.join('. ') : 'None';
}

export function buildPreferenceTags(dietNames = [], preferences = DEFAULT_RECIPE_PREFERENCES) {
  const prefs = normalizeRecipePreferences(preferences);
  return [
    ...dietNames,
    ...prefs.customDiets,
    ...prefs.cuisines.slice(0, 3),
    ...prefs.mealTypes.slice(0, 3),
    prefs.cookingTime !== 'any' ? prefs.cookingTime : '',
    prefs.budget !== 'any' ? prefs.budget : '',
    prefs.skillLevel !== 'any' ? prefs.skillLevel : '',
  ].filter(Boolean);
}

export async function saveUserPreferences(userId, selectedDietIds, selectedAllergies, options = {}) {
  const { markOnboarded = true, recipePreferences } = options;
  const normalizedAllergies = normalizeAllergyPreferences(selectedAllergies);
  const normalizedRecipePreferences = recipePreferences === undefined ? undefined : normalizeRecipePreferences(recipePreferences);

  throwIfError(
    await supabase.from('user_diet_preferences').delete().eq('user_id', userId),
    'Unable to clear diet preferences.'
  );
  if (selectedDietIds.length > 0) {
    throwIfError(await supabase.from('user_diet_preferences').insert(
      selectedDietIds.map(id => ({ user_id: userId, diet_type_id: id }))
    ), 'Unable to save diet preferences.');
  }

  throwIfError(
    await supabase.from('user_allergy_preferences').delete().eq('user_id', userId),
    'Unable to clear allergy preferences.'
  );
  if (normalizedAllergies.length > 0) {
    throwIfError(await supabase.from('user_allergy_preferences').insert(
      normalizedAllergies.map(allergy => ({ user_id: userId, ...allergy }))
    ), 'Unable to save allergy preferences.');
  }

  const profileUpdate = {};
  if (normalizedRecipePreferences !== undefined) {
    profileUpdate.recipe_preferences = normalizedRecipePreferences;
  }
  if (markOnboarded) {
    profileUpdate.onboarding_completed_at = new Date().toISOString();
  }

  if (Object.keys(profileUpdate).length > 0) {
    throwIfError(
      await supabase
        .from('app_user_profiles')
        .update(profileUpdate)
        .eq('user_id', userId),
      'Unable to save recipe preferences.'
    );
  }
}
