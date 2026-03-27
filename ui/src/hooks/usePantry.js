import { useState, useEffect, useCallback } from 'react';
import { fetchPantryItems, insertPantryItem, discardPantryItem } from '../services/pantryService';

export function usePantry(user, householdId) {
  const [pantryItems, setPantryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPantry = useCallback(async () => {
    if (!householdId) {
      setPantryItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const items = await fetchPantryItems(householdId);
    setPantryItems(items);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    fetchPantry();
  }, [fetchPantry]);

  const addPantryItem = useCallback(async (itemData) => {
    if (!user || !householdId) return;
    await insertPantryItem(householdId, user.id, itemData);
    await fetchPantry();
  }, [user, householdId, fetchPantry]);

  const removePantryItem = useCallback(async (itemId) => {
    if (!user) return;
    await discardPantryItem(itemId, user.id);
    await fetchPantry();
  }, [user, fetchPantry]);

  return { pantryItems, loading, addPantryItem, removePantryItem, refreshPantry: fetchPantry };
}
