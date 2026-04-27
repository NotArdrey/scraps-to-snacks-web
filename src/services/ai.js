import { supabase } from '../lib/supabase';

async function getFunctionErrorMessage(error) {
  const fallback = 'AI service error. Please try again.';
  const response = error?.context;
  if (!response || typeof response.clone !== 'function') return fallback;

  try {
    const body = await response.clone().json();
    return body?.error || fallback;
  } catch {
    return fallback;
  }
}

async function invokeAi(action, payload) {
  const { data, error } = await supabase.functions.invoke('ai', {
    body: { action, payload },
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error));
  }

  return data;
}

export async function generateRecipe(ingredientList, dietPreference, allergyList = [], pantryItems = []) {
  return invokeAi('generateRecipe', { ingredientList, dietPreference, allergyList, pantryItems });
}

export async function scanIngredientsFromImage(imageBase64) {
  return invokeAi('scanIngredientsFromImage', { imageBase64 });
}

export async function validateIngredient(name, dietPreference, allergyList = [], freshnessData = {}) {
  return invokeAi('validateIngredient', { name, dietPreference, allergyList, freshnessData });
}

export async function scanIngredientsFromText(description) {
  return invokeAi('scanIngredientsFromText', { description });
}

export async function chatAboutSavedIngredients(question, savedRecipes, chatHistory = []) {
  return invokeAi('chatAboutSavedIngredients', { question, savedRecipes, chatHistory });
}
