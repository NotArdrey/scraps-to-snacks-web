import { supabase } from '../lib/supabase';
import { findOrCreateIngredient } from './pantry';

const QUANTITY_UNITS = [
  'pcs', 'piece', 'pieces', 'kg', 'g', 'gram', 'grams', 'lbs', 'lb', 'oz',
  'L', 'l', 'mL', 'ml', 'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons',
  'tsp', 'teaspoon', 'teaspoons',
];

function toPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parseFraction(value) {
  if (!value) return null;
  if (value.includes('/')) {
    const [top, bottom] = value.split('/').map(Number);
    return Number.isFinite(top) && Number.isFinite(bottom) && bottom !== 0 ? top / bottom : null;
  }

  return toPositiveNumber(value);
}

function parseIngredientLine(line) {
  const text = typeof line === 'string' ? line.trim().replace(/\s+/g, ' ') : '';
  if (!text) return null;

  const match = text.match(/^(\d+(?:\.\d+)?|\d+\/\d+)(?:\s+([a-zA-Z]+))?\s+(.+)$/);
  if (!match) return { name: text, quantity: null, unit: '' };

  const parsedQuantity = parseFraction(match[1]);
  const maybeUnit = match[2] || '';
  const hasKnownUnit = QUANTITY_UNITS.some(unit => unit.toLowerCase() === maybeUnit.toLowerCase());
  const name = hasKnownUnit ? match[3] : `${maybeUnit} ${match[3]}`.trim();

  return {
    name: name || text,
    quantity: parsedQuantity,
    unit: hasKnownUnit ? maybeUnit : '',
  };
}

function normalizeIngredientDetails(recipeData) {
  if (Array.isArray(recipeData.ingredientDetails) && recipeData.ingredientDetails.length > 0) {
    return recipeData.ingredientDetails
      .map(detail => {
        const name = typeof detail?.name === 'string' ? detail.name.trim() : '';
        if (!name) return null;

        return {
          name,
          quantity: toPositiveNumber(detail.quantity),
          unit: typeof detail.unit === 'string' ? detail.unit.trim() : '',
        };
      })
      .filter(Boolean);
  }

  if (Array.isArray(recipeData.ingredients) && recipeData.ingredients.length > 0) {
    return recipeData.ingredients.map(parseIngredientLine).filter(Boolean);
  }

  if (Array.isArray(recipeData.ingredientNames)) {
    return recipeData.ingredientNames
      .map(name => (typeof name === 'string' ? name.trim() : ''))
      .filter(Boolean)
      .map(name => ({ name, quantity: null, unit: '' }));
  }

  return [];
}

export async function fetchSavedRecipes(userId) {
  const { data, error } = await supabase
    .from('saved_recipes')
    .select(`
      id, saved_at, source,
      recipes(id, title, instructions_json, nutrition_json, created_at,
        recipe_ingredients(quantity, unit, ingredients(canonical_name))
      )
    `)
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });

  if (error || !data || data.length === 0) return [];

  const savedRows = data.filter(sr => sr.recipes);
  if (savedRows.length === 0) return [];

  const recipeIds = savedRows.map(sr => sr.recipes.id);

  const { data: ratings } = await supabase
    .from('cooking_events')
    .select('recipe_id, rating_value')
    .eq('user_id', userId)
    .eq('event_type', 'rated')
    .in('recipe_id', recipeIds);

  const ratingMap = {};
  if (ratings) {
    for (const r of ratings) {
      ratingMap[r.recipe_id] = r.rating_value;
    }
  }

  return savedRows.map(sr => ({
    id: sr.id,
    recipeId: sr.recipes.id,
    title: sr.recipes.title,
    date: sr.saved_at ? sr.saved_at.split('T')[0] : '',
    ingredients: sr.recipes.recipe_ingredients
      ? sr.recipes.recipe_ingredients.map(ri =>
          `${ri.quantity || ''} ${ri.unit || ''} ${ri.ingredients.canonical_name}`.trim()
        )
      : [],
    instructions: sr.recipes.instructions_json || [],
    nutrition: sr.recipes.nutrition_json || {},
    rating: ratingMap[sr.recipes.id] || 0,
  }));
}

export async function insertRecipe(userId, recipeData, modelProvider) {
  const { data: recipe } = await supabase.from('recipes').insert({
    generated_by_user_id: userId,
    title: recipeData.title,
    instructions_json: recipeData.instructions,
    nutrition_json: recipeData.nutrition,
    model_provider: modelProvider,
  }).select('id').single();

  if (!recipe) return null;

  const ingredientDetails = normalizeIngredientDetails(recipeData);

  if (ingredientDetails.length > 0) {
    const ingredientRows = [];
    for (const detail of ingredientDetails) {
      const ingredient = await findOrCreateIngredient(detail.name, detail.unit);
      if (ingredient) {
        const row = {
          recipe_id: recipe.id,
          ingredient_id: ingredient.id,
        };
        if (detail.quantity) row.quantity = detail.quantity;
        if (detail.unit) row.unit = detail.unit;
        ingredientRows.push(row);
      }
    }
    if (ingredientRows.length > 0) {
      await supabase.from('recipe_ingredients').insert(ingredientRows);
    }
  }

  await supabase.from('saved_recipes').insert({
    user_id: userId,
    recipe_id: recipe.id,
    source: 'generated',
  });

  return recipe;
}

export async function removeSavedRecipe(savedRecipeId, userId) {
  await supabase.from('saved_recipes').delete().eq('id', savedRecipeId).eq('user_id', userId);
}

export async function updateRecipeTitle(recipeId, title) {
  await supabase.from('recipes').update({ title }).eq('id', recipeId);
}

export async function updateRecipeDetails(recipeId, { instructions, ingredientNames }) {
  if (instructions !== undefined) {
    await supabase.from('recipes').update({ instructions_json: instructions }).eq('id', recipeId);
  }

  if (ingredientNames !== undefined) {
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);

    const ingredientRows = [];
    for (const name of ingredientNames) {
      const ingredient = await findOrCreateIngredient(name);
      if (ingredient) {
        ingredientRows.push({
          recipe_id: recipeId,
          ingredient_id: ingredient.id,
        });
      }
    }
    if (ingredientRows.length > 0) {
      await supabase.from('recipe_ingredients').insert(ingredientRows);
    }
  }
}

export async function upsertRating(userId, recipeId, ratingValue) {
  await supabase
    .from('cooking_events')
    .delete()
    .eq('user_id', userId)
    .eq('recipe_id', recipeId)
    .eq('event_type', 'rated');

  await supabase.from('cooking_events').insert({
    user_id: userId,
    recipe_id: recipeId,
    event_type: 'rated',
    rating_value: ratingValue,
  });
}
