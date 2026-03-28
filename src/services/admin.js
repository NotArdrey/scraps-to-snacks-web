import { supabase } from '../lib/supabase';
import { findOrCreateIngredient } from './pantry';

// ── Fetch (existing) ──────────────────────────────────────────────

export async function fetchAllUsers() {
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) { console.error('fetchAllUsers error:', error); return []; }
  if (!data) return [];
  const seen = new Set();
  return data.filter(u => {
    if (seen.has(u.user_id)) return false;
    seen.add(u.user_id);
    return true;
  });
}

export async function fetchAdminStats() {
  const { data, error } = await supabase.rpc('admin_get_stats');
  if (error) { console.error('fetchAdminStats error:', error); return null; }
  return data;
}

export async function fetchAllPlans() {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('price_cents', { ascending: true });
  if (error) { console.error('fetchAllPlans error:', error); return []; }
  return data || [];
}

export async function fetchAllPantryItems() {
  const { data, error } = await supabase
    .from('pantry_items')
    .select('id, quantity, unit, status, expires_at, created_at, ingredients(canonical_name, category)')
    .eq('status', 'available')
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchAllPantryItems error:', error); return []; }
  return data || [];
}

export async function fetchAllRecipes() {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, title, model_provider, created_at')
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchAllRecipes error:', error); return []; }
  return data || [];
}

export async function fetchAllHouseholds() {
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id, user_id');
  if (error) { console.error('fetchAllHouseholds error:', error); return []; }
  return data || [];
}

// ── Users CRUD ────────────────────────────────────────────────────

export async function updateUserRole(userId, newRole) {
  const { error } = await supabase
    .from('app_user_profiles')
    .update({ role: newRole })
    .eq('user_id', userId);
  return { error };
}

export async function updateUserSubscription(userId, planId, status) {
  const normalizedPlanId = planId || null;
  const normalizedStatus = status || null;

  // Get most recent subscription record for this user.
  const { data: existing, error: existingError } = await supabase
    .from('user_subscriptions')
    .select('id, status, plan_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) return { error: existingError };

  if (!existing) {
    if (!normalizedPlanId && !normalizedStatus) return { error: null };
    if (!normalizedPlanId) {
      return { error: { message: 'A plan is required when setting a subscription status.' } };
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('user_subscriptions')
      .insert({ user_id: userId, plan_id: normalizedPlanId, status: normalizedStatus || 'active', starts_at: now });
    return { error };
  }

  // Clearing both fields means canceling the current subscription record.
  if (!normalizedPlanId && !normalizedStatus) {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ status: 'canceled' })
      .eq('id', existing.id);
    return { error };
  }

  if (!normalizedPlanId && (normalizedStatus === 'active' || normalizedStatus === 'trialing')) {
    return { error: { message: 'A plan is required for active or trialing status.' } };
  }

  const updates = {};
  if (normalizedPlanId && normalizedPlanId !== existing.plan_id) updates.plan_id = normalizedPlanId;
  if (normalizedStatus) {
    if (normalizedStatus !== existing.status) updates.status = normalizedStatus;
  } else if (existing.status !== 'canceled') {
    updates.status = 'canceled';
  }

  if (Object.keys(updates).length === 0) return { error: null };

  const { error } = await supabase
    .from('user_subscriptions')
    .update(updates)
    .eq('id', existing.id);
  return { error };
}

export async function deleteUserProfile(userId) {
  const { error } = await supabase
    .from('app_user_profiles')
    .delete()
    .eq('user_id', userId);
  return { error };
}

// ── Plans CRUD ────────────────────────────────────────────────────

export async function togglePlanActive(planId, isActive) {
  const { error } = await supabase
    .from('subscription_plans')
    .update({ is_active: isActive })
    .eq('id', planId);
  return { error };
}

export async function createPlan({ display_name, plan_code, price_cents, billing_period_days, is_active }) {
  const { data, error } = await supabase
    .from('subscription_plans')
    .insert({ display_name, plan_code, price_cents, billing_period_days, is_active })
    .select()
    .single();
  return { data, error };
}

export async function updatePlan(planId, updates) {
  const { data, error } = await supabase
    .from('subscription_plans')
    .update(updates)
    .eq('id', planId)
    .select()
    .single();
  return { data, error };
}

export async function deletePlan(planId) {
  const { error } = await supabase
    .from('subscription_plans')
    .delete()
    .eq('id', planId);
  return { error };
}

// ── Pantry CRUD ───────────────────────────────────────────────────

export async function adminCreatePantryItem({ ingredientName, quantity, unit, category, expiresAt, householdId, userId }) {
  const ingredient = await findOrCreateIngredient(ingredientName, unit, category);
  if (!ingredient) return { data: null, error: { message: 'Failed to find or create ingredient' } };

  const { data, error } = await supabase
    .from('pantry_items')
    .insert({
      household_id: householdId,
      ingredient_id: ingredient.id,
      quantity: quantity || 1,
      unit: unit || 'pcs',
      status: 'available',
      expires_at: expiresAt || null,
      created_by_user_id: userId,
    })
    .select('id, quantity, unit, status, expires_at, created_at, ingredients(canonical_name, category)')
    .single();
  return { data, error };
}

export async function updatePantryItem(itemId, { quantity, unit, expires_at }) {
  const { data, error } = await supabase
    .from('pantry_items')
    .update({ quantity, unit, expires_at })
    .eq('id', itemId)
    .select('id, quantity, unit, status, expires_at, created_at, ingredients(canonical_name, category)')
    .single();
  return { data, error };
}

export async function deletePantryItem(itemId) {
  const { error } = await supabase
    .from('pantry_items')
    .update({ status: 'discarded' })
    .eq('id', itemId);
  return { error };
}

// ── Recipes CRUD ──────────────────────────────────────────────────

export async function updateRecipeTitle(recipeId, title) {
  const { data, error } = await supabase
    .from('recipes')
    .update({ title })
    .eq('id', recipeId)
    .select('id, title, model_provider, created_at')
    .single();
  return { data, error };
}

export async function deleteRecipe(recipeId) {
  await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
  await supabase.from('saved_recipes').delete().eq('recipe_id', recipeId);
  const { error } = await supabase.from('recipes').delete().eq('id', recipeId);
  return { error };
}
