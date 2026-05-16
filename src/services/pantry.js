import { supabase } from '../lib/supabase';

function firstRow(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

const PANTRY_SELECT = 'id, quantity, unit, expires_at, status, source, estimated_unit_price, pricing_unit, currency, ingredients(id, canonical_name, category)';
const PANTRY_SELECT_FALLBACK = 'id, quantity, unit, expires_at, status, source, ingredients(id, canonical_name, category)';

function parseOptionalPrice(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : null;
}

function isPriceColumnError(error) {
  return /estimated_unit_price|pricing_unit|currency/i.test(error?.message || '');
}

async function selectPantryRows(queryBuilder) {
  let { data, error } = await queryBuilder(PANTRY_SELECT);
  if (error && isPriceColumnError(error)) {
    const fallback = await queryBuilder(PANTRY_SELECT_FALLBACK);
    data = fallback.data;
    error = fallback.error;
  }
  if (error) throw new Error(error.message);
  return data;
}

export async function findOrCreateIngredient(name, unit, category) {
  const cleanName = name?.trim();
  if (!cleanName) return null;

  const { data: existingIngredients, error: findError } = await supabase
    .from('ingredients')
    .select('id')
    .ilike('canonical_name', cleanName)
    .limit(1);

  if (findError) {
    console.error('findOrCreateIngredient lookup error:', findError);
    return null;
  }

  let ingredient = existingIngredients?.[0] || null;

  if (!ingredient) {
    const insertData = { canonical_name: cleanName, default_unit: unit || 'pcs' };
    if (category) insertData.category = category;
    const { data: newIngredients, error: insertError } = await supabase
      .from('ingredients')
      .insert(insertData)
      .select('id')
      .limit(1);
    if (insertError) {
      console.error('findOrCreateIngredient insert error:', insertError);
      return null;
    }
    ingredient = newIngredients?.[0] || null;
  }

  return ingredient;
}

export async function fetchPantryItems(householdId) {
  const data = await selectPantryRows(select => supabase
    .from('pantry_items')
    .select(select)
    .eq('household_id', householdId)
    .in('status', ['available', 'expired'])
    .order('expires_at', { ascending: true, nullsFirst: false }));
  if (!data) return [];

  return data.map(mapPantryItem);
}

function mapPantryItem(item) {
  return {
    id: item.id,
    ingredientId: item.ingredients.id,
    name: item.ingredients.canonical_name,
    quantity: Number(item.quantity),
    unit: item.unit || 'pcs',
    expires: item.expires_at ? item.expires_at.split('T')[0] : null,
    status: item.status,
    category: item.ingredients.category,
    estimatedUnitPrice: parseOptionalPrice(item.estimated_unit_price),
    pricingUnit: item.pricing_unit || item.unit || 'pcs',
    currency: item.currency || 'PHP',
  };
}

export async function insertPantryItem(householdId, userId, { name, quantity, unit, expiresAt, source, category, estimatedUnitPrice, pricingUnit, currency }) {
  const ingredient = await findOrCreateIngredient(name, unit, category);
  if (!ingredient) return null;

  const price = parseOptionalPrice(estimatedUnitPrice);
  const insertPayload = {
    household_id: householdId,
    ingredient_id: ingredient.id,
    quantity: quantity || 1,
    unit: unit || 'pcs',
    source: source || 'manual',
    expires_at: expiresAt || null,
    status: 'available',
    created_by_user_id: userId,
  };

  if (price) {
    insertPayload.estimated_unit_price = price;
    insertPayload.pricing_unit = pricingUnit || unit || 'pcs';
    insertPayload.currency = currency || 'PHP';
  }

  let { data: pantryRows, error: insertError } = await supabase
    .from('pantry_items')
    .insert(insertPayload)
    .select('id')
    .limit(1);

  if (insertError && isPriceColumnError(insertError)) {
    const fallbackPayload = { ...insertPayload };
    delete fallbackPayload.estimated_unit_price;
    delete fallbackPayload.pricing_unit;
    delete fallbackPayload.currency;
    const fallback = await supabase
      .from('pantry_items')
      .insert(fallbackPayload)
      .select('id')
      .limit(1);
    pantryRows = fallback.data;
    insertError = fallback.error;
  }

  if (insertError) throw new Error(insertError.message);

  const pantryItem = firstRow(pantryRows);

  if (pantryItem) {
    await supabase.from('pantry_item_events').insert({
      pantry_item_id: pantryItem.id,
      event_type: 'add',
      delta_quantity: quantity || 1,
      actor_user_id: userId,
    });
  }

  return pantryItem;
}

export async function updatePantryItem(itemId, userId, { name, quantity, unit, category, expiresAt, estimatedUnitPrice, pricingUnit, currency }) {
  const cleanName = name?.trim();
  if (!cleanName) throw new Error('Ingredient name is required.');

  const cleanUnit = unit || 'pcs';
  const ingredient = await findOrCreateIngredient(cleanName, cleanUnit, category);
  if (!ingredient) throw new Error('Failed to find or create ingredient.');

  const { error: ingredientError } = await supabase
    .from('ingredients')
    .update({
      canonical_name: cleanName,
      default_unit: cleanUnit,
      category: category || null,
    })
    .eq('id', ingredient.id);

  if (ingredientError) throw new Error(ingredientError.message);

  const price = parseOptionalPrice(estimatedUnitPrice);
  const updates = {
    ingredient_id: ingredient.id,
    quantity: quantity || 1,
    unit: cleanUnit,
    expires_at: expiresAt || null,
    estimated_unit_price: price,
    pricing_unit: price ? pricingUnit || cleanUnit : null,
    currency: currency || 'PHP',
  };

  let { data, error } = await supabase
    .from('pantry_items')
    .update(updates)
    .eq('id', itemId)
    .select(PANTRY_SELECT)
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
      .select(PANTRY_SELECT_FALLBACK)
      .limit(1);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw new Error(error.message);

  await supabase.from('pantry_item_events').insert({
    pantry_item_id: itemId,
    event_type: 'update',
    actor_user_id: userId,
  });

  const updatedItem = firstRow(data);
  return updatedItem ? mapPantryItem(updatedItem) : null;
}

export async function updatePantryItemQuantity(itemId, userId, quantity) {
  const nextQuantity = Number(quantity);
  if (!Number.isFinite(nextQuantity)) throw new Error('Quantity must be a valid number.');

  const updates = nextQuantity <= 0
    ? { quantity: 0, status: 'used' }
    : { quantity: nextQuantity };

  const data = await selectPantryRows(select => supabase
    .from('pantry_items')
    .update(updates)
    .eq('id', itemId)
    .select(select)
    .limit(1));

  await supabase.from('pantry_item_events').insert({
    pantry_item_id: itemId,
    event_type: nextQuantity <= 0 ? 'deduct' : 'update',
    actor_user_id: userId,
    reason: nextQuantity <= 0 ? 'Marked as used from pantry quantity controls' : 'Adjusted quantity from pantry controls',
  });

  const updatedItem = firstRow(data);
  return updatedItem ? mapPantryItem(updatedItem) : null;
}

export async function markPantryItemUsed(itemId, userId) {
  const { error } = await supabase
    .from('pantry_items')
    .update({ status: 'used', quantity: 0 })
    .eq('id', itemId);

  if (error) throw new Error(error.message);

  await supabase.from('pantry_item_events').insert({
    pantry_item_id: itemId,
    event_type: 'deduct',
    actor_user_id: userId,
    reason: 'Marked as used from pantry bulk action',
  });
}

export async function discardPantryItem(itemId, userId) {
  await supabase
    .from('pantry_items')
    .update({ status: 'discarded' })
    .eq('id', itemId);

  await supabase.from('pantry_item_events').insert({
    pantry_item_id: itemId,
    event_type: 'discard',
    actor_user_id: userId,
  });
}
