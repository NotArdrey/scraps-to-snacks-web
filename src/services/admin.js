import { supabase } from '../lib/supabase';
import { findOrCreateIngredient } from './pantry';
import { ensureRecipeCostEstimate } from '../utils/costEstimate';

const QUANTITY_UNITS = [
  'pcs', 'piece', 'pieces', 'kg', 'g', 'gram', 'grams', 'lbs', 'lb', 'oz',
  'L', 'l', 'mL', 'ml', 'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons',
  'tsp', 'teaspoon', 'teaspoons',
];

function firstRow(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

const ADMIN_PANTRY_SELECT = 'id, quantity, unit, status, expires_at, created_at, estimated_unit_price, pricing_unit, currency, ingredients(canonical_name, category)';
const ADMIN_PANTRY_SELECT_FALLBACK = 'id, quantity, unit, status, expires_at, created_at, ingredients(canonical_name, category)';

function parseOptionalPrice(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : null;
}

function isPriceColumnError(error) {
  return /estimated_unit_price|pricing_unit|currency/i.test(error?.message || '');
}

function parsePositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parseFraction(value) {
  if (!value) return null;
  if (value.includes('/')) {
    const [top, bottom] = value.split('/').map(Number);
    return Number.isFinite(top) && Number.isFinite(bottom) && bottom !== 0 ? top / bottom : null;
  }

  return parsePositiveNumber(value);
}

function parseIngredientLine(line) {
  const text = typeof line === 'string' ? line.trim().replace(/\s+/g, ' ') : '';
  if (!text) return null;

  const match = text.match(/^(\d+(?:\.\d+)?|\d+\/\d+)(?:\s+([a-zA-Z]+))?\s+(.+)$/);
  if (!match) return { name: text, quantity: null, unit: '' };

  const quantity = parseFraction(match[1]);
  const maybeUnit = match[2] || '';
  const hasKnownUnit = QUANTITY_UNITS.some(unit => unit.toLowerCase() === maybeUnit.toLowerCase());
  const name = hasKnownUnit ? match[3] : `${maybeUnit} ${match[3]}`.trim();

  return {
    name: name || text,
    quantity,
    unit: hasKnownUnit ? maybeUnit : '',
  };
}

function formatRecipeIngredient(row) {
  const name = row?.ingredients?.canonical_name || '';
  if (!name) return '';
  return [row.quantity || '', row.unit || '', name].filter(Boolean).join(' ').trim();
}

function mapAdminRecipe(recipe) {
  if (!recipe) return null;
  const mappedRecipe = {
    ...recipe,
    instructions: Array.isArray(recipe.instructions_json) ? recipe.instructions_json : [],
    metadata: recipe.metadata_json || {},
    costEstimate: recipe.metadata_json?.costEstimate || recipe.nutrition_json?.costEstimate || null,
    ingredients: Array.isArray(recipe.recipe_ingredients)
      ? recipe.recipe_ingredients.map(formatRecipeIngredient).filter(Boolean)
      : [],
  };

  return ensureRecipeCostEstimate(mappedRecipe);
}

async function fetchAdminRecipeById(recipeId) {
  let { data, error } = await supabase
    .from('recipes')
    .select(`
      id, title, instructions_json, nutrition_json, metadata_json, created_at,
      recipe_ingredients(quantity, unit, ingredients(canonical_name))
    `)
    .eq('id', recipeId)
    .limit(1);

  if (error) {
    const fallback = await supabase
      .from('recipes')
      .select(`
        id, title, instructions_json, nutrition_json, created_at,
        recipe_ingredients(quantity, unit, ingredients(canonical_name))
      `)
      .eq('id', recipeId)
      .limit(1);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return { data: null, error };
  return { data: mapAdminRecipe(firstRow(data)), error: null };
}

async function replaceRecipeIngredients(recipeId, ingredientLines) {
  const { error: deleteError } = await supabase
    .from('recipe_ingredients')
    .delete()
    .eq('recipe_id', recipeId);

  if (deleteError) return deleteError;

  const rows = [];
  for (const line of ingredientLines || []) {
    const detail = parseIngredientLine(line);
    if (!detail?.name) continue;

    const ingredient = await findOrCreateIngredient(detail.name, detail.unit);
    if (ingredient) {
      const row = {
        recipe_id: recipeId,
        ingredient_id: ingredient.id,
      };
      if (detail.quantity) row.quantity = detail.quantity;
      if (detail.unit) row.unit = detail.unit;
      rows.push(row);
    }
  }

  if (rows.length === 0) return null;

  const { error } = await supabase.from('recipe_ingredients').insert(rows);
  return error;
}

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
  let { data, error } = await supabase
    .from('pantry_items')
    .select(ADMIN_PANTRY_SELECT)
    .in('status', ['available', 'expired'])
    .order('created_at', { ascending: false });

  if (error && isPriceColumnError(error)) {
    const fallback = await supabase
      .from('pantry_items')
      .select(ADMIN_PANTRY_SELECT_FALLBACK)
      .in('status', ['available', 'expired'])
      .order('created_at', { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) { console.error('fetchAllPantryItems error:', error); return []; }
  return data || [];
}

export async function fetchAllRecipes() {
  let { data, error } = await supabase
    .from('recipes')
    .select(`
      id, title, instructions_json, nutrition_json, metadata_json, created_at,
      recipe_ingredients(quantity, unit, ingredients(canonical_name))
    `)
    .order('created_at', { ascending: false });

  if (error) {
    const fallback = await supabase
      .from('recipes')
      .select(`
        id, title, instructions_json, nutrition_json, created_at,
        recipe_ingredients(quantity, unit, ingredients(canonical_name))
      `)
      .order('created_at', { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) { console.error('fetchAllRecipes error:', error); return []; }
  return (data || []).map(mapAdminRecipe).filter(Boolean);
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
  const { data, error } = await supabase.rpc('admin_delete_user', { target_user_id: userId });
  return { data, error };
}

export async function pruneAuthUserMismatches() {
  const { data, error } = await supabase.rpc('admin_prune_auth_user_mismatches');
  return { data, error };
}

// ── Plans CRUD ────────────────────────────────────────────────────

export async function togglePlanActive(planId, isActive) {
  const { error } = await supabase
    .from('subscription_plans')
    .update({ is_active: isActive })
    .eq('id', planId);
  return { error };
}

export async function createPlan({ display_name, plan_code, price_cents, billing_period_days, is_active, currency = 'PHP' }) {
  const { data, error } = await supabase
    .from('subscription_plans')
    .insert({ display_name, plan_code, price_cents, billing_period_days, is_active, currency })
    .select()
    .limit(1);
  return { data: firstRow(data), error };
}

export async function updatePlan(planId, updates) {
  const { data, error } = await supabase
    .from('subscription_plans')
    .update(updates)
    .eq('id', planId)
    .select()
    .limit(1);
  return { data: firstRow(data), error };
}

export async function deletePlan(planId) {
  const { error } = await supabase
    .from('subscription_plans')
    .delete()
    .eq('id', planId);
  return { error };
}

// ── Pantry CRUD ───────────────────────────────────────────────────

export async function adminCreatePantryItem({ ingredientName, quantity, unit, category, expiresAt, householdId, userId, estimatedUnitPrice, pricingUnit, currency }) {
  const ingredient = await findOrCreateIngredient(ingredientName, unit, category);
  if (!ingredient) return { data: null, error: { message: 'Failed to find or create ingredient' } };

  const price = parseOptionalPrice(estimatedUnitPrice);
  const insertPayload = {
    household_id: householdId,
    ingredient_id: ingredient.id,
    quantity: quantity || 1,
    unit: unit || 'pcs',
    status: 'available',
    expires_at: expiresAt || null,
    created_by_user_id: userId,
  };

  if (price) {
    insertPayload.estimated_unit_price = price;
    insertPayload.pricing_unit = pricingUnit || unit || 'pcs';
    insertPayload.currency = currency || 'PHP';
  }

  let { data, error } = await supabase
    .from('pantry_items')
    .insert(insertPayload)
    .select(ADMIN_PANTRY_SELECT)
    .limit(1);

  if (error && isPriceColumnError(error)) {
    const fallbackPayload = { ...insertPayload };
    delete fallbackPayload.estimated_unit_price;
    delete fallbackPayload.pricing_unit;
    delete fallbackPayload.currency;
    const fallback = await supabase
      .from('pantry_items')
      .insert(fallbackPayload)
      .select(ADMIN_PANTRY_SELECT_FALLBACK)
      .limit(1);
    data = fallback.data;
    error = fallback.error;
  }

  return { data: firstRow(data), error };
}

export async function updatePantryItem(itemId, { ingredientName, quantity, unit, category, expires_at, estimatedUnitPrice, pricingUnit, currency }) {
  const price = parseOptionalPrice(estimatedUnitPrice);
  const updates = {
    quantity,
    unit,
    expires_at,
    estimated_unit_price: price,
    pricing_unit: price ? pricingUnit || unit || 'pcs' : null,
    currency: currency || 'PHP',
  };

  if (ingredientName?.trim()) {
    const ingredient = await findOrCreateIngredient(ingredientName, unit, category);
    if (!ingredient) return { data: null, error: { message: 'Failed to find or create ingredient' } };
    updates.ingredient_id = ingredient.id;

    await supabase
      .from('ingredients')
      .update({ default_unit: unit || 'pcs', category: category || null })
      .eq('id', ingredient.id);
  }

  let { data, error } = await supabase
    .from('pantry_items')
    .update(updates)
    .eq('id', itemId)
    .select(ADMIN_PANTRY_SELECT)
    .limit(1);

  if (error && isPriceColumnError(error)) {
    const fallbackUpdates = { ...updates };
    delete fallbackUpdates.estimated_unit_price;
    delete fallbackUpdates.pricing_unit;
    delete fallbackUpdates.currency;
    const fallback = await supabase
      .from('pantry_items')
      .update(fallbackUpdates)
      .eq('id', itemId)
      .select(ADMIN_PANTRY_SELECT_FALLBACK)
      .limit(1);
    data = fallback.data;
    error = fallback.error;
  }

  return { data: firstRow(data), error };
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
  let { data, error } = await supabase
    .from('recipes')
    .update({ title })
    .eq('id', recipeId)
    .select('id, title, instructions_json, nutrition_json, metadata_json, created_at')
    .limit(1);

  if (error) {
    const fallback = await supabase
      .from('recipes')
      .update({ title })
      .eq('id', recipeId)
      .select('id, title, instructions_json, nutrition_json, created_at')
      .limit(1);
    data = fallback.data;
    error = fallback.error;
  }

  return { data: mapAdminRecipe(firstRow(data)), error };
}

export async function adminCreateRecipe({ userId, title, instructions, ingredientLines }) {
  const insertPayload = {
    generated_by_user_id: userId,
    title,
    instructions_json: instructions || [],
    nutrition_json: {},
    metadata_json: {},
    model_provider: 'admin',
  };

  const { data: createdRows, error: createError } = await supabase
    .from('recipes')
    .insert(insertPayload)
    .select('id')
    .limit(1);

  if (createError) return { data: null, error: createError };

  const recipeId = firstRow(createdRows)?.id;
  if (!recipeId) return { data: null, error: { message: 'Recipe was not returned after creation.' } };

  const ingredientError = await replaceRecipeIngredients(recipeId, ingredientLines);
  if (ingredientError) return { data: null, error: ingredientError };

  return fetchAdminRecipeById(recipeId);
}

export async function adminUpdateRecipe(recipeId, { title, instructions, ingredientLines }) {
  const { error: recipeError } = await supabase
    .from('recipes')
    .update({
      title,
      instructions_json: instructions || [],
    })
    .eq('id', recipeId);

  if (recipeError) return { data: null, error: recipeError };

  const ingredientError = await replaceRecipeIngredients(recipeId, ingredientLines);
  if (ingredientError) return { data: null, error: ingredientError };

  return fetchAdminRecipeById(recipeId);
}

export async function deleteRecipe(recipeId) {
  await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
  await supabase.from('saved_recipes').delete().eq('recipe_id', recipeId);
  const { error } = await supabase.from('recipes').delete().eq('id', recipeId);
  return { error };
}
