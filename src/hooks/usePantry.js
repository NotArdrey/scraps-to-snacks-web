import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { fetchPantryItems, insertPantryItem, discardPantryItem } from '../services/pantry';

export function usePantry(user, householdId) {
  const [pantryItems, setPantryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const mutatingRef = useRef(false);

  const fetchPantry = useCallback(async ({ silent = false } = {}) => {
    if (!householdId) {
      setPantryItems([]);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    const items = await fetchPantryItems(householdId);
    setPantryItems(items);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    fetchPantry();
  }, [fetchPantry]);

  // Supabase Realtime: silently re-fetch when pantry_items change for this household
  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`pantry-${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pantry_items', filter: `household_id=eq.${householdId}` }, () => {
        if (!mutatingRef.current) fetchPantry({ silent: true });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [householdId, fetchPantry]);

  // Re-fetch when the tab regains focus
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchPantry({ silent: true }); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [fetchPantry]);

  const addPantryItem = useCallback(async (itemData) => {
    if (!user || !householdId) return;
    mutatingRef.current = true;
    await insertPantryItem(householdId, user.id, itemData);
    await fetchPantry({ silent: true });
    mutatingRef.current = false;
  }, [user, householdId, fetchPantry]);

  const removePantryItem = useCallback(async (itemId) => {
    if (!user) return;
    mutatingRef.current = true;
    await discardPantryItem(itemId, user.id);
    await fetchPantry({ silent: true });
    mutatingRef.current = false;
  }, [user, fetchPantry]);

  const removePantryItems = useCallback(async (itemIds) => {
    if (!user || itemIds.length === 0) return;
    mutatingRef.current = true;
    for (const id of itemIds) {
      await discardPantryItem(id, user.id);
    }
    await fetchPantry({ silent: true });
    mutatingRef.current = false;
  }, [user, fetchPantry]);

  return { pantryItems, loading, addPantryItem, removePantryItem, removePantryItems, refreshPantry: fetchPantry };
}
