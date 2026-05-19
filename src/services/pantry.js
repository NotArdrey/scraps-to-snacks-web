import { supabase } from '../lib/supabase';

const CATEGORY_KEYWORDS = [
  { category: 'Fruits', keywords: ['apple', 'banana', 'grape', 'orange', 'mango', 'berry', 'fruit'] },
  { category: 'Vegetables', keywords: ['spinach', 'tomato', 'onion', 'garlic', 'carrot', 'lettuce', 'kale', 'pepper', 'mushroom'] },
  { category: 'Meat', keywords: ['chicken', 'beef', 'pork', 'turkey', 'ham', 'sausage', 'bacon'] },
  { category: 'Seafood', keywords: ['fish', 'shrimp', 'crab', 'tuna', 'salmon', 'shellfish'] },
  { category: 'Protein', keywords: ['egg', 'tofu', 'tempeh'] },
  { category: 'Dairy', keywords: ['milk', 'cheese', 'butter', 'cream', 'yogurt'] },
  { category: 'Grains', keywords: ['rice', 'pasta', 'bread', 'flour', 'oats', 'noodle', 'cereal'] },
  { category: 'Spices', keywords: ['salt', 'pepper', 'paprika', 'cumin', 'cinnamon', 'spice'] },
  { category: 'Beverages', keywords: ['juice', 'coffee', 'tea', 'soda', 'water'] },
  { category: 'Condiments', keywords: ['sauce', 'ketchup', 'mustard', 'vinegar', 'soy sauce', 'mayonnaise'] },
  { category: 'Baking', keywords: ['sugar', 'yeast', 'baking powder', 'cocoa'] },
  { category: 'Frozen', keywords: ['frozen'] },
  { category: 'Canned', keywords: ['canned', 'can '] },
];

function titleCaseIngredientName(name) {
  const cleanName = name?.trim().replace(/\s+/g, ' ');
  if (!cleanName) return '';

  const lower = cleanName.toLowerCase();
  if (lower === 'egg' || lower === 'eggs') return 'Eggs';

  return lower.replace(/\b[a-z]/g, letter => letter.toUpperCase());
}

export function inferIngredientCategory(name) {
  const lowerName = name?.toLowerCase() || '';
  const match = CATEGORY_KEYWORDS.find(({ keywords }) => (
    keywords.some(keyword => lowerName.includes(keyword))
  ));
  return match?.category || null;
}

function firstRow(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

export async function findOrCreateIngredient(name, unit, category) {
  const cleanName = titleCaseIngredientName(name);
  if (!cleanName) return null;
  const finalCategory = category || inferIngredientCategory(cleanName);

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
    if (finalCategory) insertData.category = finalCategory;
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
    name: titleCaseIngredientName(item.ingredients.canonical_name),
    quantity: Number(item.quantity),
    unit: item.unit || 'pcs',
    expires: item.expires_at ? item.expires_at.split('T')[0] : null,
    status: item.status,
    category: item.ingredients.category || inferIngredientCategory(item.ingredients.canonical_name),
  };
}

export async function insertPantryItem(householdId, userId, { name, quantity, unit, expiresAt, source, category }) {
  const ingredient = await findOrCreateIngredient(name, unit, category);
  if (!ingredient) return null;

  const { data: pantryRows } = await supabase
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
    .limit(1);

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

export async function updatePantryItem(itemId, userId, { name, quantity, unit, category, expiresAt }) {
  const cleanName = titleCaseIngredientName(name);
  if (!cleanName) throw new Error('Ingredient name is required.');

  const cleanUnit = unit || 'pcs';
  const finalCategory = category || inferIngredientCategory(cleanName);
  const ingredient = await findOrCreateIngredient(cleanName, cleanUnit, finalCategory);
  if (!ingredient) throw new Error('Failed to find or create ingredient.');

  const { error: ingredientError } = await supabase
    .from('ingredients')
    .update({
      canonical_name: cleanName,
      default_unit: cleanUnit,
      category: finalCategory || null,
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
    .limit(1);

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
  const cleanQuantity = Math.max(0, Number(quantity) || 0);

  const { data, error } = await supabase
    .from('pantry_items')
    .update({ quantity: cleanQuantity })
    .eq('id', itemId)
    .select('id, quantity, unit, expires_at, status, source, ingredients(id, canonical_name, category)')
    .limit(1);

  if (error) throw new Error(error.message);

  await supabase.from('pantry_item_events').insert({
    pantry_item_id: itemId,
    event_type: 'update',
    delta_quantity: cleanQuantity,
    actor_user_id: userId,
  });

  const updatedItem = firstRow(data);
  return updatedItem ? mapPantryItem(updatedItem) : null;
}

export async function markPantryItemUsed(itemId, userId) {
  await supabase
    .from('pantry_items')
    .update({ status: 'used' })
    .eq('id', itemId);

  await supabase.from('pantry_item_events').insert({
    pantry_item_id: itemId,
    event_type: 'use',
    actor_user_id: userId,
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
