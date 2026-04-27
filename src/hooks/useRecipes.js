import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { fetchSavedRecipes, insertRecipe, removeSavedRecipe, updateRecipeTitle, updateRecipeDetails, upsertRating } from '../services/recipe';

export function useRecipes(user) {
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const mutatingRef = useRef(false);

  const fetchRecipes = useCallback(async ({ silent = false } = {}) => {
    if (!user) {
      setSavedRecipes([]);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    const recipes = await fetchSavedRecipes(user.id);
    setSavedRecipes(recipes);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    const timeoutId = setTimeout(fetchRecipes, 0);
    return () => clearTimeout(timeoutId);
  }, [fetchRecipes]);

  // Supabase Realtime: silently re-fetch when saved_recipes change for this user
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`recipes-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_recipes', filter: `user_id=eq.${user.id}` }, () => {
        if (!mutatingRef.current) fetchRecipes({ silent: true });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchRecipes]);

  // Re-fetch when the tab regains focus
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchRecipes({ silent: true }); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [fetchRecipes]);

  const saveRecipe = useCallback(async (recipeData, modelProvider = 'ai') => {
    if (!user) return;
    mutatingRef.current = true;
    try {
      await insertRecipe(user.id, recipeData, modelProvider);
      await fetchRecipes({ silent: true });
    } finally {
      mutatingRef.current = false;
    }
  }, [user, fetchRecipes]);

  const deleteRecipe = useCallback(async (savedRecipeId) => {
    if (!user) return;
    mutatingRef.current = true;
    try {
      await removeSavedRecipe(savedRecipeId, user.id);
      await fetchRecipes({ silent: true });
    } finally {
      mutatingRef.current = false;
    }
  }, [user, fetchRecipes]);

  const deleteRecipes = useCallback(async (savedRecipeIds) => {
    if (!user || savedRecipeIds.length === 0) return;
    mutatingRef.current = true;
    try {
      for (const id of savedRecipeIds) {
        await removeSavedRecipe(id, user.id);
      }
      await fetchRecipes({ silent: true });
    } finally {
      mutatingRef.current = false;
    }
  }, [user, fetchRecipes]);

  const updateRecipe = useCallback(async (recipeId, savedRecipeId, { title, rating, instructions, ingredientNames }) => {
    if (!user) return;
    mutatingRef.current = true;
    try {
      if (title !== undefined) {
        await updateRecipeTitle(recipeId, title);
      }
      if (rating !== undefined) {
        await upsertRating(user.id, recipeId, rating);
      }
      if (instructions !== undefined || ingredientNames !== undefined) {
        await updateRecipeDetails(recipeId, { instructions, ingredientNames });
      }
      await fetchRecipes({ silent: true });
    } finally {
      mutatingRef.current = false;
    }
  }, [user, fetchRecipes]);

  return { savedRecipes, loading, saveRecipe, deleteRecipe, deleteRecipes, updateRecipe, refreshRecipes: fetchRecipes };
}
