import { supabase } from '../lib/supabase';

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

export async function saveUserPreferences(userId, selectedDietIds, selectedAllergyIds) {
  await supabase.from('user_diet_preferences').delete().eq('user_id', userId);
  if (selectedDietIds.length > 0) {
    await supabase.from('user_diet_preferences').insert(
      selectedDietIds.map(id => ({ user_id: userId, diet_type_id: id }))
    );
  }

  await supabase.from('user_allergy_preferences').delete().eq('user_id', userId);
  if (selectedAllergyIds.length > 0) {
    await supabase.from('user_allergy_preferences').insert(
      selectedAllergyIds.map(id => ({ user_id: userId, allergy_type_id: id, severity: 'medium' }))
    );
  }

  await supabase
    .from('app_user_profiles')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('user_id', userId);
}
