import React, { useEffect, useMemo, useState, useContext } from 'react';
import { Plus, Trash2, ChefHat, Sparkles, Save, Flame, X, AlertTriangle, ShieldCheck, Pencil, Check, Search, Filter, CalendarDays, PackageCheck, ShieldAlert, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../AppContextValue';
import { usePantry } from '../hooks/usePantry';
import { useRecipes } from '../hooks/useRecipes';
import { usePreferences } from '../hooks/usePreferences';
import { generateRecipe, validateIngredient } from '../services/ai';
import { inferIngredientCategory } from '../services/pantry';
import ConfirmModal from '../components/ConfirmModal';
import FeedbackModal from '../components/FeedbackModal';
import LoadingPanel from '../components/LoadingPanel';
import { CATEGORIES, UNITS } from '../constants/categories';
import { EXPIRY_WARNING_MS } from '../constants/dietary';

const OBVIOUS_NON_FOOD_ITEMS = new Set([
  'dinosaur',
  'dragon',
  'unicorn',
  'mermaid',
  'robot',
  'phone',
  'laptop',
  'computer',
  'soap',
  'chair',
  'table',
  'plastic',
  'paper',
  'rock',
  'stone',
]);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDateOnly(date) {
  if (!date) return null;
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function getExpiryInfo(expires) {
  const expiryDate = parseDateOnly(expires);
  if (!expiryDate) {
    return {
      state: 'neutral',
      label: 'No expiration set',
      detail: 'Add a date for freshness tracking',
      daysUntilExpiry: null,
      isExpired: false,
      isToday: false,
      isExpiringSoon: false,
    };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / MS_PER_DAY);

  if (daysUntilExpiry < 0) {
    const daysAgo = Math.abs(daysUntilExpiry);
    return {
      state: 'danger',
      label: daysAgo === 1 ? 'Expired yesterday' : `Expired ${daysAgo} days ago`,
      detail: expires,
      daysUntilExpiry,
      isExpired: true,
      isToday: false,
      isExpiringSoon: true,
    };
  }

  if (daysUntilExpiry === 0) {
    return {
      state: 'danger',
      label: 'Expires today',
      detail: expires,
      daysUntilExpiry,
      isExpired: false,
      isToday: true,
      isExpiringSoon: true,
    };
  }

  const warningDays = EXPIRY_WARNING_MS / MS_PER_DAY;
  if (daysUntilExpiry <= warningDays) {
    return {
      state: 'warning',
      label: `In ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`,
      detail: expires,
      daysUntilExpiry,
      isExpired: false,
      isToday: false,
      isExpiringSoon: true,
    };
  }

  return {
    state: 'success',
    label: `In ${daysUntilExpiry} days`,
    detail: expires,
    daysUntilExpiry,
    isExpired: false,
    isToday: false,
    isExpiringSoon: false,
  };
}

function normalizeTerm(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/^avoid ingredient:\s*/i, '')
    .replace(/^no\s+/i, '')
    .trim();
}

function singularize(value) {
  return value.endsWith('s') ? value.slice(0, -1) : value;
}

function formatConflictLabel(value) {
  const normalized = normalizeTerm(value);
  if (normalized === 'egg' || normalized === 'eggs') return 'Eggs';
  return normalized.replace(/\b[a-z]/g, letter => letter.toUpperCase());
}

function getAllergyConflicts(itemName, category, allergyTerms) {
  const haystack = `${itemName} ${category || ''}`.toLowerCase();
  const conflicts = allergyTerms.filter(term => {
    const normalized = normalizeTerm(term);
    if (!normalized) return false;
    const singular = singularize(normalized);
    return haystack.includes(normalized) || haystack.includes(singular);
  });
  return [...new Set(conflicts.map(formatConflictLabel))];
}

function getFreshnessLabel(expiryInfo) {
  if (expiryInfo.isExpired) return 'Do not use';
  if (expiryInfo.isToday) return 'Use today';
  if (expiryInfo.isExpiringSoon) return 'Use soon';
  if (expiryInfo.daysUntilExpiry === null) return 'Unknown freshness';
  return 'Fresh';
}

function getStorageSuggestion(category) {
  if (['Dairy', 'Meat', 'Seafood'].includes(category)) return 'Fridge';
  if (category === 'Frozen') return 'Freezer';
  if (['Fruits', 'Vegetables'].includes(category)) return 'Fridge or counter';
  return 'Pantry';
}

function formatQuantity(quantity) {
  return Number.isInteger(quantity) ? quantity : Number(quantity).toFixed(1).replace(/\.0$/, '');
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function Pantry() {
  const navigate = useNavigate();
  const { user, householdId } = useContext(AppContext);
  const { pantryItems: items, loading: pantryLoading, addPantryItem, editPantryItem, removePantryItem, removePantryItems } = usePantry(user, householdId);
  const { saveRecipe } = useRecipes(user);
  const { activeAllergyNames, allergyDisplayNames, preferenceTags, recipePreferenceText } = usePreferences(user);

  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState('pcs');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemExpires, setNewItemExpires] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);
  const [addWarning, setAddWarning] = useState(null);
  const [pendingItem, setPendingItem] = useState(null);
  const [generatedRecipe, setGeneratedRecipe] = useState(null);
  const [genError, setGenError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
  const [confirmEdit, setConfirmEdit] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', quantity: 1, unit: 'pcs', category: '', expiresAt: '' });
  const [savingEditId, setSavingEditId] = useState(null);
  const [editError, setEditError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortMode, setSortMode] = useState('expires-asc');

  const allergyTerms = useMemo(() => (
    [...new Set(
      [...activeAllergyNames, ...allergyDisplayNames]
        .map(normalizeTerm)
        .filter(Boolean)
    )]
  ), [activeAllergyNames, allergyDisplayNames]);

  const enrichedItems = useMemo(() => items.map(item => {
    const displayName = item.name || '';
    const category = item.category || inferIngredientCategory(displayName) || 'Uncategorized';
    const expiryInfo = getExpiryInfo(item.expires);
    const allergyConflicts = getAllergyConflicts(displayName, category, allergyTerms);
    const hasAllergyConflict = allergyConflicts.length > 0;
    const statusInfo = hasAllergyConflict
      ? {
          state: 'danger',
          label: 'Allergy conflict',
          detail: `${allergyConflicts.join(', ')} excluded`,
        }
      : expiryInfo;

    return {
      ...item,
      displayName,
      category,
      expiryInfo,
      statusInfo,
      allergyConflicts,
      freshnessLabel: hasAllergyConflict ? 'Blocked by allergy' : getFreshnessLabel(expiryInfo),
      storageSuggestion: getStorageSuggestion(category),
    };
  }), [items, allergyTerms]);

  const availableCategories = useMemo(() => (
    [...new Set(enrichedItems.map(item => item.category).filter(Boolean))].sort()
  ), [enrichedItems]);

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const nextItems = enrichedItems.filter(item => {
      const matchesSearch = !query || `${item.displayName} ${item.category}`.toLowerCase().includes(query);
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesStatus = (
        statusFilter === 'all' ||
        (statusFilter === 'expiring' && item.expiryInfo.isExpiringSoon && !item.expiryInfo.isExpired) ||
        (statusFilter === 'expired' && item.expiryInfo.isExpired) ||
        (statusFilter === 'fresh' && !item.expiryInfo.isExpiringSoon && item.expiryInfo.daysUntilExpiry !== null && item.allergyConflicts.length === 0) ||
        (statusFilter === 'no-expiration' && item.expiryInfo.daysUntilExpiry === null) ||
        (statusFilter === 'allergy-conflict' && item.allergyConflicts.length > 0) ||
        (statusFilter === 'selected' && selectedItems.includes(item.id))
      );
      return matchesSearch && matchesCategory && matchesStatus;
    });

    return nextItems.sort((a, b) => {
      if (sortMode === 'name-asc') return a.displayName.localeCompare(b.displayName);
      if (sortMode === 'category-asc') return a.category.localeCompare(b.category) || a.displayName.localeCompare(b.displayName);
      if (sortMode === 'conflicts-first') return b.allergyConflicts.length - a.allergyConflicts.length || a.displayName.localeCompare(b.displayName);
      const aDays = a.expiryInfo.daysUntilExpiry ?? Number.POSITIVE_INFINITY;
      const bDays = b.expiryInfo.daysUntilExpiry ?? Number.POSITIVE_INFINITY;
      return aDays - bDays || a.displayName.localeCompare(b.displayName);
    });
  }, [categoryFilter, enrichedItems, searchTerm, selectedItems, sortMode, statusFilter]);

  const pantryStats = useMemo(() => {
    const expiringToday = enrichedItems.filter(item => item.expiryInfo.isToday).length;
    const expired = enrichedItems.filter(item => item.expiryInfo.isExpired).length;
    const allergyConflicts = enrichedItems.filter(item => item.allergyConflicts.length > 0).length;
    const expiringSoon = enrichedItems.filter(item => item.expiryInfo.isExpiringSoon && !item.expiryInfo.isToday && !item.expiryInfo.isExpired).length;
    const recipeReady = enrichedItems.filter(item => !item.expiryInfo.isExpired && item.allergyConflicts.length === 0).length;

    return {
      total: enrichedItems.length,
      expiringToday,
      expired,
      allergyConflicts,
      expiringSoon,
      recipeReady,
      selected: selectedItems.length,
    };
  }, [enrichedItems, selectedItems.length]);

  const selectedRecipeItems = useMemo(() => (
    enrichedItems.filter(item => selectedItems.includes(item.id))
  ), [enrichedItems, selectedItems]);

  const blockedSelectedCount = selectedRecipeItems.filter(item => (
    item.expiryInfo.isExpired || item.allergyConflicts.length > 0
  )).length;
  const recipeReadySelectedCount = Math.max(0, selectedRecipeItems.length - blockedSelectedCount);
  const attentionCount = enrichedItems.filter(item => (
    item.expiryInfo.isExpired || item.expiryInfo.isToday || item.allergyConflicts.length > 0
  )).length;
  const activeFilterCount = [
    searchTerm.trim(),
    categoryFilter !== 'all',
    statusFilter !== 'all',
    sortMode !== 'expires-asc',
  ].filter(Boolean).length;
  const quickAddCategoryPreview = newItemCategory || inferIngredientCategory(newItemName) || 'Auto-detect';
  const quickAddStoragePreview = quickAddCategoryPreview === 'Auto-detect'
    ? 'Storage suggestion appears after category detection'
    : getStorageSuggestion(quickAddCategoryPreview);
  const freshnessAttentionParts = [
    pantryStats.expired > 0 ? pluralize(pantryStats.expired, 'expired item') : null,
    pantryStats.expiringToday > 0 ? pluralize(pantryStats.expiringToday, 'due today item', 'due today items') : null,
    pantryStats.expiringSoon > 0 ? pluralize(pantryStats.expiringSoon, 'expiring soon item') : null,
  ].filter(Boolean);
  const attentionSummary = [
    freshnessAttentionParts.join(', '),
    pantryStats.allergyConflicts > 0
      ? `${freshnessAttentionParts.length > 0 ? 'includes ' : ''}${pluralize(pantryStats.allergyConflicts, 'allergy conflict')}`
      : null,
  ].filter(Boolean).join('; ') || 'No urgent items';
  const selectedRecipeSummary = selectedItems.length === 0
    ? 'No items selected yet'
    : `${pluralize(selectedItems.length, 'selected item')} - ${pluralize(recipeReadySelectedCount, 'recipe-ready item')} - ${pluralize(blockedSelectedCount, 'blocked item')}`;
  const recipeActionRule = selectedItems.length === 0
    ? `Select rows to generate a recipe from chosen pantry items. ${pluralize(pantryStats.recipeReady, 'safe pantry item')} available.`
    : `Generate selected uses ${pluralize(recipeReadySelectedCount, 'safe selected item')} and skips ${pluralize(blockedSelectedCount, 'blocked selected item')}.`;
  const allergyConflictSummary = enrichedItems
    .filter(item => item.allergyConflicts.length > 0)
    .map(item => {
      const itemName = normalizeTerm(item.displayName);
      const itemSingular = singularize(itemName);
      const matchesItemName = item.allergyConflicts.some(conflict => singularize(normalizeTerm(conflict)) === itemSingular);
      return matchesItemName
        ? `${item.displayName} are in your pantry`
        : `${item.displayName} conflicts with ${item.allergyConflicts.join(', ')}`;
    })
    .join('; ');

  useEffect(() => {
    const validIds = new Set(items.map(item => item.id));
    setSelectedItems(prev => {
      const next = prev.filter(id => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [items]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName) return;
    setAdding(true);
    setAddError(null);
    setAddWarning(null);

    try {
      const validation = await validateIngredient(newItemName, recipePreferenceText, activeAllergyNames);

      if (!validation.isFood) {
        setAddError(validation.reason || `"${newItemName}" is not a valid food ingredient.`);
        setAdding(false);
        return;
      }

      const finalName = validation.correctedName || newItemName;
      const finalCategory = newItemCategory || validation.category || null;
      const finalExpiry = newItemExpires || validation.estimatedExpiryDate || null;
      const itemData = {
        name: finalName,
        quantity: newItemQuantity,
        unit: newItemUnit,
        category: finalCategory,
        expiresAt: finalExpiry,
      };

      if (validation.dietConflict || validation.allergyConflict) {
        setPendingItem(itemData);
        setAddWarning(validation.warning || 'This ingredient may conflict with your diet or allergies.');
        setAdding(false);
        return;
      }

      await addPantryItem(itemData);
      resetForm();
    } catch {
      setAddError('Failed to validate ingredient. Please try again.');
    }
    setAdding(false);
  };

  const confirmAddItem = async () => {
    if (!pendingItem) return;
    setAdding(true);
    await addPantryItem(pendingItem);
    setPendingItem(null);
    setAddWarning(null);
    resetForm();
    setAdding(false);
  };

  const cancelPendingItem = () => {
    setPendingItem(null);
    setAddWarning(null);
  };

  const resetForm = () => {
    setNewItemName('');
    setNewItemQuantity(1);
    setNewItemUnit('pcs');
    setNewItemCategory('');
    setNewItemExpires('');
  };

  const handleEditItem = (item) => {
    setEditingItemId(item.id);
    setEditError(null);
    setEditForm({
      name: item.name || '',
      quantity: item.quantity || 1,
      unit: item.unit || 'pcs',
      category: item.category || '',
      expiresAt: item.expires || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditError(null);
  };

  const setEditValue = (key, value) => {
    setEditForm(prev => ({ ...prev, [key]: value }));
    setEditError(null);
  };

  const handleSaveEdit = async (itemId) => {
    const cleanName = editForm.name.trim();
    const quantity = Number(editForm.quantity);
    if (!cleanName) {
      setEditError('Ingredient name is required.');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setEditError('Amount must be greater than 0.');
      return;
    }

    setConfirmEdit({
      itemId,
      name: cleanName,
      payload: {
        name: cleanName,
        quantity,
        unit: editForm.unit,
        category: editForm.category || null,
        expiresAt: editForm.expiresAt || null,
      },
    });
  };

  const confirmSaveEdit = async () => {
    if (!confirmEdit) return;
    const { itemId, name, payload } = confirmEdit;
    setConfirmEdit(null);
    setSavingEditId(itemId);
    setEditError(null);
    try {
      await editPantryItem(itemId, payload);
      setEditingItemId(null);
      setFeedback({
        title: 'Pantry item updated',
        message: `"${name}" was saved successfully.`,
        variant: 'success',
      });
    } catch (err) {
      const message = err.message || 'Failed to update pantry item.';
      setEditError(message);
      setFeedback({
        title: 'Update failed',
        message,
        variant: 'error',
      });
    } finally {
      setSavingEditId(null);
    }
  };

  const handleToggleSelect = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleGenerateRecipe = async (mode = 'selected') => {
    const candidateItems = mode === 'all' ? enrichedItems : selectedRecipeItems;
    if (candidateItems.length === 0) return;
    setLoading(true);
    setGenError(null);

    try {
      const excludedItems = candidateItems.filter(item => item.expiryInfo.isExpired || item.allergyConflicts.length > 0);
      const selectedItemsData = candidateItems.filter(item => !item.expiryInfo.isExpired && item.allergyConflicts.length === 0);

      if (selectedItemsData.length === 0) {
        setGenError('No recipe-ready items found. Expired and allergy-conflicting items are excluded automatically.');
        return;
      }

      if (excludedItems.length > 0) {
        setGenError(`Excluded ${excludedItems.length} expired or allergy-conflicting item${excludedItems.length !== 1 ? 's' : ''} from recipe generation.`);
      }

      const obviousNonFoodItems = selectedItemsData
        .map(item => item.displayName?.trim())
        .filter(name => OBVIOUS_NON_FOOD_ITEMS.has(name?.toLowerCase()));

      if (obviousNonFoodItems.length > 0) {
        setGenError(`Remove non-food item${obviousNonFoodItems.length === 1 ? '' : 's'} before generating a recipe: ${obviousNonFoodItems.join(', ')}.`);
        return;
      }

      const validationResults = await Promise.all(
        selectedItemsData.map(async item => ({
          item,
          validation: await validateIngredient(item.displayName, recipePreferenceText, activeAllergyNames),
        }))
      );
      const invalidItems = validationResults
        .filter(({ validation }) => !validation.isFood)
        .map(({ item }) => item.displayName);

      if (invalidItems.length > 0) {
        setGenError(`Remove non-food item${invalidItems.length === 1 ? '' : 's'} before generating a recipe: ${invalidItems.join(', ')}.`);
        return;
      }

      const ingredientList = selectedItemsData.map(i => `${i.quantity} ${i.unit} ${i.displayName}`);
      const pantryItems = selectedItemsData.map(item => ({
        name: item.displayName,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        expires: item.expires,
      }));
      const recipe = await generateRecipe(ingredientList, recipePreferenceText, activeAllergyNames, pantryItems);
      setGeneratedRecipe(recipe);
    } catch (err) {
      setGenError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!generatedRecipe) return;
    try {
      await saveRecipe(generatedRecipe, 'ai');
      setGeneratedRecipe(null);
      setFeedback({
        title: 'Recipe saved',
        message: `"${generatedRecipe.title}" was added to your cookbook.`,
        variant: 'success',
        actionText: 'Open Cookbook',
        onClose: () => navigate('/cookbook'),
      });
    } catch (err) {
      setFeedback({
        title: 'Save failed',
        message: err.message || 'Unable to save this recipe. Please try again.',
        variant: 'error',
      });
    }
  };

  const handleDeleteItem = (itemId) => {
    const item = items.find(i => i.id === itemId);
    setConfirmDelete({ id: itemId, name: item?.name || 'this item' });
  };

  const confirmDeleteItem = async () => {
    if (!confirmDelete) return;
    const itemName = confirmDelete.name;
    try {
      await removePantryItem(confirmDelete.id);
      setSelectedItems(prev => prev.filter(id => id !== confirmDelete.id));
      setFeedback({
        title: 'Pantry item removed',
        message: `"${itemName}" was removed from your pantry.`,
        variant: 'success',
      });
    } catch (err) {
      setFeedback({
        title: 'Remove failed',
        message: err.message || `Unable to remove "${itemName}". Please try again.`,
        variant: 'error',
      });
    }
    setConfirmDelete(null);
  };

  const handleBatchDelete = () => {
    if (selectedItems.length === 0) return;
    setConfirmBatchDelete(true);
  };

  const confirmBatchDeleteItems = async () => {
    const itemCount = selectedItems.length;
    setConfirmBatchDelete(false);
    try {
      await removePantryItems(selectedItems);
      setSelectedItems([]);
      setFeedback({
        title: 'Selected items removed',
        message: `${itemCount} pantry item${itemCount !== 1 ? 's were' : ' was'} removed.`,
        variant: 'success',
      });
    } catch (err) {
      setFeedback({
        title: 'Remove failed',
        message: err.message || 'Unable to remove the selected items. Please try again.',
        variant: 'error',
      });
    }
  };

  const closeFeedback = () => {
    const afterClose = feedback?.onClose;
    setFeedback(null);
    afterClose?.();
  };

  const handleSelectAll = () => {
    const visibleIds = filteredItems.map(item => item.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedItems.includes(id));
    if (allVisibleSelected) {
      setSelectedItems(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedItems(prev => [...new Set([...prev, ...visibleIds])]);
    }
  };

  if (pantryLoading) {
    return <LoadingPanel title="Loading pantry" message="Fetching your household ingredients." />;
  }

  return (
    <div className="pantry-page">
      <section className="pantry-command-header" aria-labelledby="pantry-title">
        <div className="pantry-command-icon" aria-hidden="true">
          <PackageCheck size={28} />
        </div>
        <div className="pantry-command-copy">
          <span className="pantry-kicker">Inventory workbench</span>
          <h1 id="pantry-title">Pantry</h1>
          <p>Track freshness, catch allergy conflicts, and generate recipes from ingredients that are safe to use.</p>
          <div className="pantry-chip-row" aria-label="Active recipe constraints">
            {preferenceTags.length > 0 && (
              <span>Preferences: {preferenceTags.slice(0, 4).join(', ')}</span>
            )}
            {allergyDisplayNames.length > 0 && (
              <span className="danger">Avoid: {allergyDisplayNames.slice(0, 4).join(', ')}</span>
            )}
            {preferenceTags.length === 0 && allergyDisplayNames.length === 0 && (
              <span>No recipe constraints set</span>
            )}
          </div>
        </div>
      </section>

      <section className="pantry-overview-grid" aria-label="Pantry overview">
        <div className="pantry-stat-card">
          <span>Total items</span>
          <strong>{pantryStats.total}</strong>
          <small>{filteredItems.length} visible after filters</small>
        </div>
        <div className={`pantry-stat-card ${attentionCount > 0 ? 'warning' : ''}`}>
          <span>Needs attention</span>
          <strong>{attentionCount}</strong>
          <small>{attentionSummary}</small>
        </div>
        <div className={`pantry-stat-card ${pantryStats.allergyConflicts > 0 ? 'danger' : ''}`}>
          <span>Allergy conflicts</span>
          <strong>{pantryStats.allergyConflicts}</strong>
          <small>{allergyDisplayNames.length > 0 ? `Avoiding ${allergyDisplayNames.join(', ')}` : 'No allergies selected'}</small>
        </div>
        <div className="pantry-stat-card">
          <span>Recipe-ready</span>
          <strong>{pantryStats.recipeReady}</strong>
          <small>{pluralize(pantryStats.recipeReady, 'safe item')} available</small>
        </div>
      </section>

      {pantryStats.allergyConflicts > 0 && (
        <div className="pantry-safety-alert" role="alert">
          <ShieldAlert size={20} />
          <div>
            <strong>Allergy conflict detected</strong>
            <span>{allergyConflictSummary}</span>
          </div>
        </div>
      )}

      <div className="glass-panel pantry-side-panel">
        <div className="pantry-panel-heading">
          <span>Quick add</span>
          <h2>Add pantry item</h2>
          <p>Validation checks food type, likely category, expiry, and diet or allergy conflicts.</p>
        </div>
        <form id="pantry-add-form" className="pantry-quick-add-form" onSubmit={handleAddItem}>
          <div className="pantry-add-fields">
            <div className="input-container" style={{ flex: 2, minWidth: '180px', margin: 0 }}>
              <label htmlFor="add-item" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block', fontWeight: '500' }}>Ingredient Name</label>
              <input type="text" id="add-item" className="input-field" placeholder="E.g., apples, eggs, red grapes..." value={newItemName} onChange={e => { setNewItemName(e.target.value); setAddError(null); }} />
            </div>
            <div className="input-container" style={{ flex: '0 0 88px', minWidth: '88px', margin: 0 }}>
              <label htmlFor="add-qty" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block', fontWeight: '500' }}>Qty</label>
              <input type="number" id="add-qty" className="input-field" min="0.1" step="0.1" value={newItemQuantity} onChange={e => setNewItemQuantity(Math.max(0.1, Number(e.target.value) || 0.1))} />
            </div>
            <div className="input-container" style={{ flex: '0 0 100px', minWidth: '100px', margin: 0 }}>
              <label htmlFor="add-unit" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block', fontWeight: '500' }}>Unit</label>
              <select id="add-unit" className="input-field" value={newItemUnit} onChange={e => setNewItemUnit(e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="input-container" style={{ flex: '1 1 160px', minWidth: '160px', margin: 0 }}>
              <label htmlFor="add-category" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block', fontWeight: '500' }}>Category (opt)</label>
              <select id="add-category" className="input-field" value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)}>
                <option value="">Auto-detect</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="input-container" style={{ flex: '1 1 172px', minWidth: '172px', margin: 0 }}>
              <label htmlFor="add-expires" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block', fontWeight: '500' }}>Expiration (opt)</label>
              <input type="date" id="add-expires" className="input-field" value={newItemExpires} onChange={e => setNewItemExpires(e.target.value)} />
            </div>
            <button type="submit" disabled={adding} className="btn-primary" style={{ padding: '0 1.5rem', height: '44px', whiteSpace: 'nowrap', opacity: adding ? 0.7 : 1 }}>
              {adding ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={16} style={{ animation: 'spin 2s linear infinite' }} /> Validating...
                </span>
              ) : (
                <><Plus size={18} /> Add</>
              )}
            </button>
          </div>
          <p className="pantry-add-help">
            Auto-detect fills category and expiration when possible. Recipes exclude expired and allergy-conflicting items automatically.
          </p>
          <div className="pantry-storage-preview">
            <span>Storage suggestion</span>
            <strong>{quickAddStoragePreview}</strong>
            <small>Based on the selected or detected category.</small>
          </div>
          {addError && (
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.9rem', background: 'rgba(239,68,68,0.08)', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)' }}>
              <AlertTriangle size={16} /> {addError}
            </div>
          )}
          {addWarning && (
            <div style={{ marginTop: '0.75rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d97706', fontSize: '0.9rem', flex: 1 }}>
                <AlertTriangle size={16} /> {addWarning}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={cancelPendingItem} className="btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}>Cancel</button>
                <button type="button" onClick={confirmAddItem} className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}>Add Anyway</button>
              </div>
            </div>
          )}
        </form>
        <div className="pantry-rule-card">
          <span>Recipe rules</span>
          <strong>Keto and allergen-safe generation</strong>
          <p>Recipe actions skip expired ingredients and exclude allergy conflicts automatically.</p>
        </div>
      </div>

      <div className="pantry-main-panel">
        <section className="pantry-inventory-heading" aria-labelledby="pantry-inventory-title">
          <div>
            <span>Inventory</span>
            <h2 id="pantry-inventory-title">{filteredItems.length} visible item{filteredItems.length === 1 ? '' : 's'}</h2>
            <p>{selectedRecipeSummary}</p>
          </div>
          <div className="pantry-filter-pill">
            {activeFilterCount} active filter{activeFilterCount === 1 ? '' : 's'}
          </div>
        </section>

        <section className="pantry-controls" aria-label="Pantry search and filters">
          <label className="pantry-control-field pantry-search-control">
            <span className="pantry-control-label">
              <Search size={16} /> Search
            </span>
            <input
              type="search"
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Search ingredients"
            />
          </label>
          <label className="pantry-control-field">
            <span className="pantry-control-label">
              <Filter size={16} /> Category
            </span>
            <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              {availableCategories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="pantry-control-field">
            <span className="pantry-control-label">
              <CalendarDays size={16} /> Status
            </span>
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="expiring">Expiring soon</option>
              <option value="expired">Expired</option>
              <option value="fresh">Fresh and recipe-safe</option>
              <option value="no-expiration">No expiration</option>
              <option value="allergy-conflict">Allergy conflicts</option>
              <option value="selected">Selected only</option>
            </select>
          </label>
          <label className="pantry-control-field">
            <span className="pantry-control-label">
              <ArrowUpDown size={16} /> Sort
            </span>
            <select value={sortMode} onChange={event => setSortMode(event.target.value)}>
              <option value="expires-asc">Expiration date</option>
              <option value="name-asc">Name</option>
              <option value="category-asc">Category</option>
              <option value="conflicts-first">Conflicts first</option>
            </select>
          </label>
        </section>

        <div className="glass-panel pantry-table-panel" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
          <table className="pantry-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <colgroup>
            <col className="pantry-col-select" />
            <col className="pantry-col-item" />
            <col className="pantry-col-amount" />
            <col className="pantry-col-category" />
            <col className="pantry-col-storage" />
            <col className="pantry-col-status" />
            <col className="pantry-col-actions" />
          </colgroup>
          <thead>
            <tr style={{ background: 'var(--surface-active)' }}>
              <th className="pantry-select-heading" style={{ padding: '1.25rem', width: '40px' }}>
                {filteredItems.length > 0 && (
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && filteredItems.every(item => selectedItems.includes(item.id))}
                    onChange={handleSelectAll}
                    title="Select all visible items"
                    aria-label="Select all visible pantry items"
                  />
                )}
              </th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Item Name</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Amount</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Category</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Storage</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Recipe status</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => {
              const statusState = item.statusInfo.state;
              const isEditing = editingItemId === item.id;
              const isSelected = selectedItems.includes(item.id);
              const rowClassName = [
                'pantry-row',
                isSelected ? 'selected' : '',
                item.allergyConflicts.length > 0 ? 'allergy-conflict' : '',
                item.expiryInfo.isExpired ? 'expired' : '',
              ].filter(Boolean).join(' ');
              return (
                <tr key={item.id} className={rowClassName} style={{ borderBottom: '1px solid var(--surface-border)', transition: 'background var(--transition-fast)' }}>
                  <td className="pantry-select-cell" data-label="Select" style={{ padding: '1.25rem' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(item.id)}
                      aria-label={`Select ${item.displayName}`}
                    />
                  </td>
                  <td className="pantry-item-name-cell" data-label="Item" style={{ padding: '1.25rem', fontWeight: '500', minWidth: isEditing ? '180px' : undefined }}>
                    {isEditing ? (
                      <input
                        type="text"
                        className="input-field"
                        value={editForm.name}
                        onChange={e => setEditValue('name', e.target.value)}
                        style={{ minHeight: 40, padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}
                        aria-label="Edit item name"
                      />
                    ) : (
                      <div className="pantry-item-stack">
                        <strong>{item.displayName}</strong>
                        <span className={item.allergyConflicts.length > 0 ? 'blocked' : undefined}>{item.freshnessLabel}</span>
                      </div>
                    )}
                  </td>
                  <td data-label="Amount" style={{ padding: '1.25rem', color: 'var(--text-secondary)', minWidth: isEditing ? '160px' : undefined }}>
                    {isEditing ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '72px 82px', gap: '0.5rem' }}>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          className="input-field"
                          value={editForm.quantity}
                          onChange={e => setEditValue('quantity', e.target.value)}
                          style={{ minHeight: 40, padding: '0.55rem 0.65rem', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}
                          aria-label="Edit quantity"
                        />
                        <select
                          className="input-field"
                          value={editForm.unit}
                          onChange={e => setEditValue('unit', e.target.value)}
                          style={{ minHeight: 40, padding: '0.55rem 0.65rem', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}
                          aria-label="Edit unit"
                        >
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    ) : (
                      `${formatQuantity(item.quantity)} ${item.unit}`
                    )}
                  </td>
                  <td data-label="Category" style={{ padding: '1.25rem', color: 'var(--text-tertiary)', minWidth: isEditing ? '170px' : undefined }}>
                    {isEditing ? (
                      <select
                        className="input-field"
                        value={editForm.category}
                        onChange={e => setEditValue('category', e.target.value)}
                        style={{ minHeight: 40, padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}
                        aria-label="Edit category"
                      >
                        <option value="">No category</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <span className="pantry-category-pill">{item.category}</span>
                    )}
                  </td>
                  <td data-label="Storage" style={{ padding: '1.25rem', color: 'var(--text-secondary)' }}>
                    <span className="pantry-storage-pill">{item.storageSuggestion}</span>
                  </td>
                  <td data-label="Recipe status" style={{ padding: '1.25rem', minWidth: isEditing ? '170px' : undefined }}>
                    {isEditing ? (
                      <input
                        type="date"
                        className="input-field"
                        value={editForm.expiresAt}
                        onChange={e => setEditValue('expiresAt', e.target.value)}
                        style={{ minHeight: 40, padding: '0.55rem 0.65rem', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}
                        aria-label="Edit expiration date"
                      />
                    ) : (
                      <span className={`pantry-expiry-status badge-${statusState}`} title={item.expires || 'No expiration set'}>
                        <strong>{item.statusInfo.label}</strong>
                        <small>{item.statusInfo.detail}</small>
                      </span>
                    )}
                    {isEditing && editError && (
                      <div style={{ marginTop: '0.45rem', color: '#fca5a5', fontSize: '0.78rem', whiteSpace: 'normal' }}>
                        {editError}
                      </div>
                    )}
                  </td>
                  <td className="pantry-actions-cell" data-label="Actions" style={{ padding: '1.25rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleCancelEdit()}
                            className="btn-secondary"
                            disabled={savingEditId === item.id}
                            style={{ width: 34, height: 34, padding: 0, borderRadius: 'var(--radius-sm)' }}
                            title="Cancel edit"
                            aria-label="Cancel edit"
                          >
                            <X size={16} />
                          </button>
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            className="btn-primary"
                            disabled={savingEditId === item.id}
                            style={{ width: 34, height: 34, padding: 0, borderRadius: 'var(--radius-sm)' }}
                            title="Save changes"
                            aria-label="Save changes"
                          >
                            <Check size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditItem(item)}
                            className="btn-secondary"
                            style={{ width: 34, height: 34, padding: 0, borderRadius: 'var(--radius-sm)' }}
                            title="Edit item"
                            aria-label="Edit item"
                          >
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDeleteItem(item.id)} className="btn-danger" style={{ width: 34, height: 34, padding: 0 }} title="Remove item" aria-label="Remove item">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  Your pantry is currently empty. Scan a receipt or add items manually!
                </td>
              </tr>
            )}
            {items.length > 0 && filteredItems.length === 0 && (
              <tr>
                <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  No pantry items match the current search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>

          {items.length > 0 && (
            <div className="pantry-table-actions pantry-actions-bar" style={{ padding: '1.5rem', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
            {genError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.9rem', flex: 1 }}>
                <AlertTriangle size={16} /> {genError}
              </div>
            )}
            {!genError && (
              <div className="pantry-recipe-rule">
                {recipeActionRule}
              </div>
            )}
            <button
              onClick={handleBatchDelete}
              disabled={selectedItems.length === 0}
              className="btn-danger"
              style={{ padding: '0.9rem 1.5rem', opacity: selectedItems.length === 0 ? 0.6 : 1, cursor: selectedItems.length === 0 ? 'not-allowed' : 'pointer' }}
            >
              <Trash2 size={18} /> Delete Selected ({selectedItems.length})
            </button>
            <button
              onClick={() => handleGenerateRecipe('selected')}
              disabled={loading || selectedItems.length === 0 || recipeReadySelectedCount === 0}
              className="btn-primary"
              style={{ padding: '0.9rem 1.5rem', opacity: selectedItems.length === 0 || recipeReadySelectedCount === 0 ? 0.6 : 1, cursor: selectedItems.length === 0 || recipeReadySelectedCount === 0 ? 'not-allowed' : 'pointer' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={18} style={{ animation: 'spin 2s linear infinite' }} /> Generating with AI...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ChefHat size={18} /> Generate selected ({recipeReadySelectedCount})
                </span>
              )}
            </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title="Remove Pantry Item"
        message={`Are you sure you want to remove "${confirmDelete?.name}" from your pantry?`}
        confirmText="Remove"
        variant="danger"
        onConfirm={confirmDeleteItem}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmModal
        open={confirmBatchDelete}
        title="Remove Selected Items"
        message={`Are you sure you want to remove ${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''} from your pantry?`}
        confirmText="Remove All"
        variant="danger"
        onConfirm={confirmBatchDeleteItems}
        onCancel={() => setConfirmBatchDelete(false)}
      />

      <ConfirmModal
        open={!!confirmEdit}
        title="Save Pantry Changes"
        message={`Save your changes to "${confirmEdit?.name}"?`}
        confirmText="Save"
        variant="success"
        onConfirm={confirmSaveEdit}
        onCancel={() => setConfirmEdit(null)}
      />

      <FeedbackModal
        open={!!feedback}
        title={feedback?.title}
        message={feedback?.message}
        variant={feedback?.variant}
        actionText={feedback?.actionText}
        onClose={closeFeedback}
      />

      {generatedRecipe && (
        <div className="recipe-modal-backdrop" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.2)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div className="glass-card recipe-modal-card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', animation: 'slideUpFade 0.3s ease-out', padding: '2.5rem' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: 'linear-gradient(to right, var(--primary-color), var(--secondary-color))' }}></div>

            <button
              onClick={() => setGeneratedRecipe(null)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem' }}
            >
              <X size={24} />
            </button>

            <div className="recipe-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', paddingRight: '3rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-primary)' }}>{generatedRecipe.title}</h2>
                {generatedRecipe.nutrition && generatedRecipe.nutrition.cals && (
                  <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center', color: '#ff7b72', marginTop: '0.5rem' }}>
                    <Flame size={20} style={{ display: 'block' }} />
                    <strong style={{ lineHeight: 1, position: 'relative', top: '1px' }}>{generatedRecipe.nutrition.cals} kcal</strong>
                  </div>
                )}
              </div>
              <button onClick={handleSaveRecipe} className="btn-primary" style={{ padding: '0.5rem 1.5rem', whiteSpace: 'nowrap' }}>
                <Save size={18} /> Save Recipe
              </button>
            </div>

            <div className="recipe-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
              <div style={{ background: 'var(--surface-active)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary-color)', fontSize: '1.2rem' }}>Ingredients</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {generatedRecipe.ingredients.map((ing, idx) => (
                    <li key={idx} style={{ padding: '0.5rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--secondary-color)' }}></div> {ing}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '1.2rem' }}>Instructions</h4>
                {generatedRecipe.instructions.map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ background: 'var(--surface-color)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--primary-color)', flexShrink: 0 }}>
                      {idx + 1}
                    </div>
                    <div style={{ lineHeight: '1.6' }}>{step}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
