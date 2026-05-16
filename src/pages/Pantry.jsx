import React, { useState, useContext, useMemo, useEffect } from 'react';
import {
  Plus, Trash2, ChefHat, Sparkles, Save, Flame, X, AlertTriangle, ShieldCheck,
  Pencil, Check, Search, Filter, Package, Clock3, PackageX, Minus,
  ReceiptText, CheckCircle2, Utensils,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../AppContextValue';
import { usePantry } from '../hooks/usePantry';
import { useRecipes } from '../hooks/useRecipes';
import { usePreferences } from '../hooks/usePreferences';
import { generateRecipe, validateIngredient } from '../services/ai';
import ConfirmModal from '../components/ConfirmModal';
import FeedbackModal from '../components/FeedbackModal';
import LoadingPanel from '../components/LoadingPanel';
import { CATEGORIES, UNITS } from '../constants/categories';
import { ALLERGEN_KEYWORDS, EXPIRY_WARNING_MS } from '../constants/dietary';
import { HERO_IMAGES } from '../constants/images';

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

function getExpiryState(expires) {
  const expiryDate = parseDateOnly(expires);
  if (!expiryDate) return 'success';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / MS_PER_DAY);

  if (daysUntilExpiry < 0) return 'danger';
  if (daysUntilExpiry <= EXPIRY_WARNING_MS / MS_PER_DAY) return 'warning';
  return 'success';
}

function getExpiryStatus(expires) {
  const expiryDate = parseDateOnly(expires);
  if (!expiryDate) return 'safe';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / MS_PER_DAY);

  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= EXPIRY_WARNING_MS / MS_PER_DAY) return 'soon';
  return 'safe';
}

function getExpiryLabel(status) {
  if (status === 'expired') return 'Expired';
  if (status === 'soon') return 'Expiring soon';
  return 'Safe';
}

function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

function formatCurrency(value, currency = 'PHP') {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function parseOptionalPriceInput(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : null;
}

function formatPricePerUnit(item) {
  if (!item.estimatedUnitPrice) return '--';
  return `${formatCurrency(item.estimatedUnitPrice, item.currency || 'PHP')}/${item.pricingUnit || item.unit || 'unit'}`;
}

function getQuantityStep(unit) {
  const normalizedUnit = normalizeText(unit);
  if (normalizedUnit === 'pcs') return 1;
  if (['kg', 'l', 'cups'].includes(normalizedUnit)) return 0.25;
  if (['g', 'ml'].includes(normalizedUnit)) return 50;
  return 1;
}

function getLowStockThreshold(unit) {
  const normalizedUnit = normalizeText(unit);
  if (normalizedUnit === 'pcs') return 1;
  if (['kg', 'l', 'cups'].includes(normalizedUnit)) return 0.25;
  if (['g', 'ml'].includes(normalizedUnit)) return 100;
  return 1;
}

function isLowStock(item) {
  return Number(item.quantity) <= getLowStockThreshold(item.unit);
}

function matchesAllergy(name, activeAllergyNames) {
  const normalizedName = normalizeText(name);
  return activeAllergyNames.some(allergyName => {
    const normalizedAllergy = normalizeText(allergyName).replace(/s$/, '');
    const keywords = ALLERGEN_KEYWORDS[normalizedAllergy] || ALLERGEN_KEYWORDS[normalizeText(allergyName)] || [normalizedAllergy];
    return keywords.some(keyword => normalizedName.includes(normalizeText(keyword)));
  });
}

function getDisplayCategory(item) {
  if (item.category) return item.category;
  const isEggLike = /\beggs?\b/i.test(item.name || '');
  return isEggLike ? 'Protein' : '';
}

function buildRecipeSuggestionIds(items) {
  return [...items]
    .sort((a, b) => {
      const aStatus = getExpiryStatus(a.expires);
      const bStatus = getExpiryStatus(b.expires);
      const rank = { expired: 0, soon: 1, safe: 2 };
      return (rank[aStatus] ?? 2) - (rank[bStatus] ?? 2);
    })
    .slice(0, 8)
    .map(item => item.id);
}

export default function Pantry() {
  const navigate = useNavigate();
  const { user, householdId } = useContext(AppContext);
  const {
    pantryItems: items,
    loading: pantryLoading,
    error: pantryError,
    addPantryItem,
    editPantryItem,
    adjustPantryItemQuantity,
    markPantryItemsUsed,
    removePantryItem,
    removePantryItems,
    refreshPantry,
  } = usePantry(user, householdId);
  const { saveRecipe } = useRecipes(user);
  const { activeDietNames, allergyTypes, userAllergies } = usePreferences(user);

  const activeAllergyNames = allergyTypes
    .filter(a => userAllergies.some(ua => ua.allergy_type_id === a.id))
    .map(a => a.name);

  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState('pcs');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemExpires, setNewItemExpires] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('available');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);
  const [addWarning, setAddWarning] = useState(null);
  const [pendingItem, setPendingItem] = useState(null);
  const [generatedRecipe, setGeneratedRecipe] = useState(null);
  const [genError, setGenError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
  const [confirmBatchUsed, setConfirmBatchUsed] = useState(false);
  const [confirmEdit, setConfirmEdit] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', quantity: 1, unit: 'pcs', estimatedUnitPrice: '', category: '', expiresAt: '' });
  const [savingEditId, setSavingEditId] = useState(null);
  const [quantitySavingIds, setQuantitySavingIds] = useState([]);
  const [editError, setEditError] = useState(null);

  const viewItems = useMemo(() => items.map(item => {
    const expiryStatus = getExpiryStatus(item.expires);
    return {
      ...item,
      displayCategory: getDisplayCategory(item),
      expiryStatus,
      expiryBadgeState: getExpiryState(item.expires),
      lowStock: isLowStock(item),
      allergyItem: matchesAllergy(item.name, activeAllergyNames),
    };
  }), [items, activeAllergyNames]);

  const categoryOptions = useMemo(() => {
    const detected = viewItems.map(item => item.displayCategory).filter(Boolean);
    return [...new Set([...CATEGORIES, ...detected])];
  }, [viewItems]);

  const filteredItems = useMemo(() => {
    const query = normalizeText(searchQuery);
    return viewItems.filter(item => {
      const matchesQuery = !query || normalizeText(`${item.name} ${item.displayCategory} ${item.unit}`).includes(query);
      const matchesCategory = categoryFilter === 'all' || item.displayCategory === categoryFilter;
      const matchesExpiry = expiryFilter === 'all' || item.expiryStatus === expiryFilter;
      const matchesStock = stockFilter === 'available' || (stockFilter === 'low' && item.lowStock);
      return matchesQuery && matchesCategory && matchesExpiry && matchesStock;
    });
  }, [viewItems, searchQuery, categoryFilter, expiryFilter, stockFilter]);

  const pantrySummary = useMemo(() => ({
    total: viewItems.length,
    expiringSoon: viewItems.filter(item => item.expiryStatus === 'soon').length,
    expired: viewItems.filter(item => item.expiryStatus === 'expired').length,
    lowStock: viewItems.filter(item => item.lowStock).length,
  }), [viewItems]);

  useEffect(() => {
    const availableIds = new Set(items.map(item => item.id));
    setSelectedItems(prev => prev.filter(id => availableIds.has(id)));
  }, [items]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName) return;
    setAdding(true);
    setAddError(null);
    setAddWarning(null);

    try {
      const unitPrice = parseOptionalPriceInput(newItemPrice);
      if (newItemPrice !== '' && unitPrice === null) {
        setAddError('Price must be greater than 0 or left blank.');
        setAdding(false);
        return;
      }

      const validation = await validateIngredient(newItemName, activeDietNames.join(', ') || 'None', activeAllergyNames);

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
        estimatedUnitPrice: unitPrice,
        pricingUnit: newItemUnit,
        currency: 'PHP',
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
    setNewItemPrice('');
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
      estimatedUnitPrice: item.estimatedUnitPrice || '',
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
    const price = parseOptionalPriceInput(editForm.estimatedUnitPrice);
    if (editForm.estimatedUnitPrice !== '' && price === null) {
      setEditError('Price must be greater than 0 or left blank.');
      return;
    }

    setConfirmEdit({
      itemId,
      name: cleanName,
      payload: {
        name: cleanName,
        quantity,
        unit: editForm.unit,
        estimatedUnitPrice: price,
        pricingUnit: editForm.unit,
        currency: 'PHP',
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

  const handleGenerateRecipe = async (idsOverride = null) => {
    const targetIds = idsOverride || selectedItems;
    if (targetIds.length === 0) return;
    setLoading(true);
    setGenError(null);

    try {
      const selectedItemsData = viewItems.filter(i => targetIds.includes(i.id));
      const obviousNonFoodItems = selectedItemsData
        .map(item => item.name?.trim())
        .filter(name => OBVIOUS_NON_FOOD_ITEMS.has(name?.toLowerCase()));

      if (obviousNonFoodItems.length > 0) {
        setGenError(`Remove non-food item${obviousNonFoodItems.length === 1 ? '' : 's'} before generating a recipe: ${obviousNonFoodItems.join(', ')}.`);
        return;
      }

      const validationResults = await Promise.all(
        selectedItemsData.map(async item => ({
          item,
          validation: await validateIngredient(item.name, activeDietNames.join(', ') || 'None', activeAllergyNames),
        }))
      );
      const invalidItems = validationResults
        .filter(({ validation }) => !validation.isFood)
        .map(({ item }) => item.name);

      if (invalidItems.length > 0) {
        setGenError(`Remove non-food item${invalidItems.length === 1 ? '' : 's'} before generating a recipe: ${invalidItems.join(', ')}.`);
        return;
      }

      const ingredientList = selectedItemsData.map(i => `${i.quantity} ${i.unit} ${i.name}`);
      const pantryItems = selectedItemsData.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
          category: item.displayCategory || item.category,
          expires: item.expires,
          estimatedUnitPrice: item.estimatedUnitPrice,
          pricingUnit: item.pricingUnit || item.unit,
          currency: item.currency || 'PHP',
        }));
      const recipe = await generateRecipe(ingredientList, activeDietNames.join(', ') || 'None', activeAllergyNames, pantryItems);
      setGeneratedRecipe(recipe);
    } catch (err) {
      setGenError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestFromPantry = () => {
    const ids = selectedItems.length > 0 ? selectedItems : buildRecipeSuggestionIds(filteredItems);
    handleGenerateRecipe(ids);
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

  const handleBatchMarkUsed = () => {
    if (selectedItems.length === 0) return;
    setConfirmBatchUsed(true);
  };

  const confirmBatchMarkUsed = async () => {
    const itemCount = selectedItems.length;
    setConfirmBatchUsed(false);
    try {
      await markPantryItemsUsed(selectedItems);
      setSelectedItems([]);
      setFeedback({
        title: 'Selected items marked as used',
        message: `${itemCount} pantry item${itemCount !== 1 ? 's were' : ' was'} moved out of your available pantry.`,
        variant: 'success',
      });
    } catch (err) {
      setFeedback({
        title: 'Update failed',
        message: err.message || 'Unable to mark the selected items as used. Please try again.',
        variant: 'error',
      });
    }
  };

  const handleAdjustQuantity = async (item, direction) => {
    const step = getQuantityStep(item.unit);
    const nextQuantity = Math.max(0, Number((Number(item.quantity) + direction * step).toFixed(2)));
    setQuantitySavingIds(prev => [...prev, item.id]);
    try {
      await adjustPantryItemQuantity(item.id, nextQuantity);
      if (nextQuantity <= 0) {
        setSelectedItems(prev => prev.filter(id => id !== item.id));
      }
    } catch (err) {
      setFeedback({
        title: 'Quantity update failed',
        message: err.message || `Unable to update "${item.name}". Please try again.`,
        variant: 'error',
      });
    } finally {
      setQuantitySavingIds(prev => prev.filter(id => id !== item.id));
    }
  };

  const closeFeedback = () => {
    const afterClose = feedback?.onClose;
    setFeedback(null);
    afterClose?.();
  };

  const handleSelectAll = () => {
    const visibleIds = filteredItems.map(i => i.id);
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

  if (pantryError) {
    return (
      <div className="hero-container">
        <div className="glass-panel pantry-state-panel">
          <AlertTriangle size={42} color="#f87171" />
          <h3>Unable to load pantry</h3>
          <p>{pantryError}</p>
          <button type="button" className="btn-primary" onClick={() => refreshPantry()}>
            <CheckCircle2 size={18} /> Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hero-container">
      
      <div className="hero-banner">
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          backgroundImage: `url("${HERO_IMAGES.pantry}")`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          zIndex: 1
        }} />
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.2))',
          zIndex: 2
        }} />
        <div className="hero-content">
          <div className="hero-icon-box">
            <Plus size={40} color="white" />
          </div>
          <div>
            <h2 className="hero-title">Household Pantry</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'inherit' }}>
              <p className="hero-subtitle">Manage your ingredients and generate recipes.</p>
              {activeDietNames.length > 0 && (
                <span style={{ background: '#84cc16', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  Diet: {activeDietNames.join(', ')}
                </span>
              )}
              {activeAllergyNames.length > 0 && (
                <span style={{ background: '#f43f5e', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  Allergies: {activeAllergyNames.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <form onSubmit={handleAddItem}>
          <div className="pantry-add-fields">
            <div className="input-container" style={{ flex: 2, minWidth: '180px', margin: 0 }}>
              <label htmlFor="add-item" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block', fontWeight: '500' }}>Ingredient Name</label>
              <input type="text" id="add-item" className="input-field" placeholder="E.g., Apples..." value={newItemName} onChange={e => { setNewItemName(e.target.value); setAddError(null); }} />
            </div>
            <div className="input-container" style={{ flex: '0 0 88px', minWidth: '88px', margin: 0 }}>
              <label htmlFor="add-qty" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block', fontWeight: '500' }}>Qty</label>
              <input type="number" id="add-qty" className="input-field" min="0.1" step="0.1" value={newItemQuantity} onChange={e => setNewItemQuantity(Number(e.target.value))} />
            </div>
            <div className="input-container" style={{ flex: '0 0 100px', minWidth: '100px', margin: 0 }}>
              <label htmlFor="add-unit" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block', fontWeight: '500' }}>Unit</label>
              <select id="add-unit" className="input-field" value={newItemUnit} onChange={e => setNewItemUnit(e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="input-container" style={{ flex: '0 0 128px', minWidth: '128px', margin: 0 }}>
              <label htmlFor="add-price" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block', fontWeight: '500' }}>Price/unit (opt)</label>
              <input
                type="number"
                id="add-price"
                className="input-field"
                min="0"
                step="0.01"
                placeholder="PHP"
                value={newItemPrice}
                onChange={e => setNewItemPrice(e.target.value)}
              />
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
      </div>

      <div className="pantry-summary-grid" aria-label="Pantry summary">
        <div className="pantry-summary-card">
          <Package size={20} />
          <span>Total Items</span>
          <strong>{pantrySummary.total}</strong>
        </div>
        <div className="pantry-summary-card warning">
          <Clock3 size={20} />
          <span>Expiring Soon</span>
          <strong>{pantrySummary.expiringSoon}</strong>
        </div>
        <div className="pantry-summary-card danger">
          <PackageX size={20} />
          <span>Expired</span>
          <strong>{pantrySummary.expired}</strong>
        </div>
        <div className="pantry-summary-card low">
          <AlertTriangle size={20} />
          <span>Low Stock</span>
          <strong>{pantrySummary.lowStock}</strong>
        </div>
      </div>

      <div className="glass-panel pantry-table-panel" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
        <div className="pantry-toolbar">
          <div className="pantry-search-box">
            <Search size={18} />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search ingredients..."
              aria-label="Search ingredients"
            />
          </div>
          <div className="pantry-filter-row" aria-label="Pantry filters">
            <Filter size={17} />
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} aria-label="Filter by category">
              <option value="all">All categories</option>
              {categoryOptions.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
            <select value={expiryFilter} onChange={e => setExpiryFilter(e.target.value)} aria-label="Filter by expiration">
              <option value="all">All expiration</option>
              <option value="soon">Expiring soon</option>
              <option value="expired">Expired</option>
              <option value="safe">Safe</option>
            </select>
            <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} aria-label="Filter by stock">
              <option value="available">Available items</option>
              <option value="low">Low stock</option>
            </select>
          </div>
          <button
            type="button"
            className="btn-primary pantry-suggest-button"
            onClick={handleSuggestFromPantry}
            disabled={loading || filteredItems.length === 0}
          >
            {loading ? <Sparkles size={18} style={{ animation: 'spin 2s linear infinite' }} /> : <ChefHat size={18} />}
            Suggest Recipes from Pantry
          </button>
        </div>

        {selectedItems.length > 0 && (
          <div className="pantry-bulk-bar">
            <strong>{selectedItems.length} selected</strong>
            <span>-</span>
            <button type="button" onClick={handleBatchDelete} className="btn-danger">
              <Trash2 size={16} /> Delete
            </button>
            <button type="button" onClick={handleBatchMarkUsed} className="btn-secondary">
              <Utensils size={16} /> Mark as used
            </button>
            <button type="button" onClick={() => handleGenerateRecipe()} disabled={loading} className="btn-primary">
              {loading ? <Sparkles size={16} style={{ animation: 'spin 2s linear infinite' }} /> : <ChefHat size={16} />}
              Generate recipe
            </button>
          </div>
        )}

        {genError && (
          <div className="pantry-error-banner">
            <AlertTriangle size={16} /> {genError}
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--surface-active)' }}>
              <th className="pantry-select-heading" style={{ padding: '1.25rem', width: '40px' }}>
                {filteredItems.length > 0 && (
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && filteredItems.every(item => selectedItems.includes(item.id))}
                    onChange={handleSelectAll}
                    title="Select all"
                  />
                )}
              </th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Item Name</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Amount</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Price</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Category</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Expires</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => {
              const expiryState = item.expiryBadgeState;
              const expiryStatusLabel = getExpiryLabel(item.expiryStatus);
              const isEditing = editingItemId === item.id;
              const quantitySaving = quantitySavingIds.includes(item.id);
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--surface-border)', transition: 'background var(--transition-fast)', background: 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td className="pantry-select-cell" data-label="Select" style={{ padding: '1.25rem' }}>
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleToggleSelect(item.id)}
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
                      <div className="pantry-item-title-wrap">
                        <span>{item.name}</span>
                        <div className="pantry-item-badges">
                          {item.allergyItem && <span className="badge badge-danger pantry-mini-badge">Allergy item</span>}
                          {item.lowStock && <span className="badge badge-warning pantry-mini-badge">Low Stock</span>}
                        </div>
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
                      <div className="pantry-quantity-control" aria-label={`Adjust ${item.name} quantity`}>
                        <button
                          type="button"
                          onClick={() => handleAdjustQuantity(item, -1)}
                          disabled={quantitySaving}
                          title={`Decrease ${item.name}`}
                          aria-label={`Decrease ${item.name}`}
                        >
                          <Minus size={14} />
                        </button>
                        <span>{item.quantity} {item.unit}</span>
                        <button
                          type="button"
                          onClick={() => handleAdjustQuantity(item, 1)}
                          disabled={quantitySaving}
                          title={`Increase ${item.name}`}
                          aria-label={`Increase ${item.name}`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td data-label="Price" style={{ padding: '1.25rem', color: 'var(--text-secondary)', minWidth: isEditing ? '130px' : undefined }}>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input-field"
                        value={editForm.estimatedUnitPrice}
                        onChange={e => setEditValue('estimatedUnitPrice', e.target.value)}
                        style={{ minHeight: 40, padding: '0.55rem 0.65rem', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}
                        aria-label="Edit unit price"
                        placeholder="PHP"
                      />
                    ) : (
                      <span>{formatPricePerUnit(item)}</span>
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
                      item.displayCategory || '--'
                    )}
                  </td>
                  <td data-label="Expires" style={{ padding: '1.25rem', minWidth: isEditing ? '170px' : undefined }}>
                    {isEditing ? (
                      <input
                        type="date"
                        className="input-field"
                        value={editForm.expiresAt}
                        onChange={e => setEditValue('expiresAt', e.target.value)}
                        style={{ minHeight: 40, padding: '0.55rem 0.65rem', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}
                        aria-label="Edit expiration date"
                      />
                    ) : item.expires ? (
                      <span className={`badge pantry-expiry-badge badge-${expiryState}`}>
                        {expiryStatusLabel}: {item.expires}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)' }}>No expiry date</span>
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
                  Your pantry is empty. Add your first ingredient to start generating recipes.
                </td>
              </tr>
            )}
            {items.length > 0 && filteredItems.length === 0 && (
              <tr>
                <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  No ingredients match your search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
        open={confirmBatchUsed}
        title="Mark Selected as Used"
        message={`Mark ${selectedItems.length} selected item${selectedItems.length !== 1 ? 's' : ''} as used? They will no longer appear in your available pantry.`}
        confirmText="Mark Used"
        variant="success"
        onConfirm={confirmBatchMarkUsed}
        onCancel={() => setConfirmBatchUsed(false)}
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

      {loading && (
        <div className="recipe-generating-backdrop" role="status" aria-live="polite" aria-label="Generating recipe">
          <div className="recipe-generating-card">
            <div className="recipe-generating-loader" aria-hidden="true">
              <span className="recipe-generating-ring"></span>
              <span className="recipe-generating-ring secondary"></span>
              <ChefHat size={34} />
              <span className="recipe-generating-steam steam-one"></span>
              <span className="recipe-generating-steam steam-two"></span>
              <span className="recipe-generating-steam steam-three"></span>
            </div>
            <div>
              <h3>Generating recipe</h3>
              <p>Checking pantry items, prices, and cooking steps.</p>
            </div>
            <div className="recipe-generating-progress" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}

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
                {generatedRecipe.costEstimate && (
                  <div className="recipe-cost-panel">
                    <h4><ReceiptText size={18} /> Estimated Cost</h4>
                    <ul className="recipe-cost-list">
                      {generatedRecipe.costEstimate.items?.map((item, idx) => (
                        <li key={`${item.name}-${idx}`}>
                          <span>
                            {item.name}
                            {!item.pantryIngredient && <em>Added</em>}
                          </span>
                          <strong>{formatCurrency(item.estimatedCost, generatedRecipe.costEstimate.currency)}</strong>
                        </li>
                      ))}
                    </ul>
                    <div className="recipe-cost-total">
                      <span>Total recipe</span>
                      <strong>{formatCurrency(generatedRecipe.costEstimate.totalCost, generatedRecipe.costEstimate.currency)}</strong>
                    </div>
                    <div className="recipe-cost-total secondary">
                      <span>Added items</span>
                      <strong>{formatCurrency(generatedRecipe.costEstimate.addedIngredientCost, generatedRecipe.costEstimate.currency)}</strong>
                    </div>
                    {generatedRecipe.costEstimate.notes && (
                      <p>{generatedRecipe.costEstimate.notes}</p>
                    )}
                    {generatedRecipe.costEstimate.sources?.length > 0 && (
                      <p>Sources: {generatedRecipe.costEstimate.sources.map(source => source.title).join(', ')}</p>
                    )}
                  </div>
                )}
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
