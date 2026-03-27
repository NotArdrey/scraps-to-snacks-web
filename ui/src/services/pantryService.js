import { supabase } from '../lib/supabase';

export async function findOrCreateIngredient(name, unit) {
  let { data: ingredient } = await supabase
    .from('ingredients')
    .select('id')
    .ilike('canonical_name', name)
    .maybeSingle();

  if (!ingredient) {
    const { data: newIng } = await supabase
      .from('ingredients')
      .insert({ canonical_name: name, default_unit: unit || 'pcs' })
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

  return data.map(item => ({
    id: item.id,
    ingredientId: item.ingredients.id,
    name: item.ingredients.canonical_name,
    quantity: Number(item.quantity),
    unit: item.unit || 'pcs',
    expires: item.expires_at ? item.expires_at.split('T')[0] : null,
    status: item.status,
    category: item.ingredients.category,
  }));
}

export async function insertPantryItem(householdId, userId, { name, quantity, unit, expiresAt, source }) {
  const ingredient = await findOrCreateIngredient(name, unit);
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
