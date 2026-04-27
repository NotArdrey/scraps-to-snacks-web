import { supabase } from '../lib/supabase';

export async function findOrCreateIngredient(name, unit, category) {
  let { data: ingredient } = await supabase
    .from('ingredients')
    .select('id')
    .ilike('canonical_name', name)
    .maybeSingle();

  if (!ingredient) {
    const insertData = { canonical_name: name, default_unit: unit || 'pcs' };
    if (category) insertData.category = category;
    const { data: newIng } = await supabase
      .from('ingredients')
      .insert(insertData)
      .select('id')
      .single();
    ingredient = newIng;
  }

  return ingredient;
}

export async function fetchPantryItems(householdId) {
  const { data, error } = await supabase
    .from('pantry_items')
    .select('id, quantity, unit, expires_at, status, source, ingredients(id, canonical_name, category)')
    .eq('household_id', householdId)
    .eq('status', 'available')
    .order('expires_at', { ascending: true, nullsFirst: false });

  if (error || !data) return [];

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
  };
}

export async function insertPantryItem(householdId, userId, { name, quantity, unit, expiresAt, source, category }) {
  const ingredient = await findOrCreateIngredient(name, unit, category);
  if (!ingredient) return null;

  const { data: pantryItem } = await supabase
    .from('pantry_items')
    .insert({
      household_id: householdId,
      ingredient_id: ingredient.id,
      quantity: quantity || 1,
      unit: unit || 'pcs',
      source: source || 'manual',
      expires_at: expiresAt || null,
      status: 'available',
      created_by_user_id: userId,
    })
    .select('id')
    .single();

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

export async function updatePantryItem(itemId, userId, { name, quantity, unit, category, expiresAt }) {
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

  const { data, error } = await supabase
    .from('pantry_items')
    .update({
      ingredient_id: ingredient.id,
      quantity: quantity || 1,
      unit: cleanUnit,
      expires_at: expiresAt || null,
    })
    .eq('id', itemId)
    .select('id, quantity, unit, expires_at, status, source, ingredients(id, canonical_name, category)')
    .single();

  if (error) throw new Error(error.message);

  await supabase.from('pantry_item_events').insert({
    pantry_item_id: itemId,
    event_type: 'update',
    actor_user_id: userId,
  });

  return data ? mapPantryItem(data) : null;
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
