import { supabase } from '../lib/supabase';
import { findOrCreateIngredient } from './pantry';

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

  const recipeIds = data.map(sr => sr.recipes.id);

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

  return data.map(sr => ({
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

  if (recipeData.ingredientNames && recipeData.ingredientNames.length > 0) {
    const ingredientRows = [];
    for (const name of recipeData.ingredientNames) {
      const ingredient = await findOrCreateIngredient(name);
      if (ingredient) {
        ingredientRows.push({
          recipe_id: recipe.id,
          ingredient_id: ingredient.id,
        });
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
