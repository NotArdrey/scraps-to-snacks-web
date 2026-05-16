import { supabase } from '../lib/supabase';
import { ensureRecipeCostEstimate } from '../utils/costEstimate';

const DEFAULT_AI_TIMEOUT_MS = 30000;
const GENERATE_AI_TIMEOUT_MS = 45000;
const VALIDATE_AI_TIMEOUT_MS = 20000;

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

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

async function invokeAi(action, payload, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_AI_TIMEOUT_MS;
  const invokePromise = supabase.functions.invoke('ai', {
    body: { action, payload },
  });

  const { data, error } = await withTimeout(
    invokePromise,
    timeoutMs,
    'AI request took too long. Please try again with fewer ingredients.',
  );

  if (error) {
    throw new Error(await getFunctionErrorMessage(error));
  }

  return data;
}

export async function generateRecipe(ingredientList, dietPreference, allergyList = [], pantryItems = []) {
  const recipe = await invokeAi('generateRecipe', { ingredientList, dietPreference, allergyList, pantryItems }, { timeoutMs: GENERATE_AI_TIMEOUT_MS });
  return ensureRecipeCostEstimate(recipe, pantryItems);
}

export async function scanIngredientsFromImage(imageBase64) {
  return invokeAi('scanIngredientsFromImage', { imageBase64 }, { timeoutMs: GENERATE_AI_TIMEOUT_MS });
}

export async function validateIngredient(name, dietPreference, allergyList = [], freshnessData = {}) {
  return invokeAi('validateIngredient', { name, dietPreference, allergyList, freshnessData }, { timeoutMs: VALIDATE_AI_TIMEOUT_MS });
}

export async function scanIngredientsFromText(description) {
  return invokeAi('scanIngredientsFromText', { description });
}

export async function chatAboutSavedIngredients(question, savedRecipes, chatHistory = []) {
  return invokeAi('chatAboutSavedIngredients', { question, savedRecipes, chatHistory });
}
