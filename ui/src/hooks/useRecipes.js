import { useState, useEffect, useCallback } from 'react';
import { fetchSavedRecipes, insertRecipe, removeSavedRecipe, updateRecipeTitle, upsertRating } from '../services/recipeService';

export function useRecipes(user) {
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecipes = useCallback(async () => {
    if (!user) {
      setSavedRecipes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const recipes = await fetchSavedRecipes(user.id);
    setSavedRecipes(recipes);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const saveRecipe = useCallback(async (recipeData, modelProvider = 'groq') => {
    if (!user) return;
    await insertRecipe(user.id, recipeData, modelProvider);
    await fetchRecipes();
  }, [user, fetchRecipes]);

  const deleteRecipe = useCallback(async (savedRecipeId) => {
    if (!user) return;
    await removeSavedRecipe(savedRecipeId, user.id);
    await fetchRecipes();
  }, [user, fetchRecipes]);

  const updateRecipe = useCallback(async (recipeId, savedRecipeId, { title, rating }) => {
    if (!user) return;
    if (title !== undefined) {
      await updateRecipeTitle(recipeId, title);
    }
    if (rating !== undefined) {
      await upsertRating(user.id, recipeId, rating);
    }
    await fetchRecipes();
  }, [user, fetchRecipes]);

  return { savedRecipes, loading, saveRecipe, deleteRecipe, updateRecipe, refreshRecipes: fetchRecipes };
}
