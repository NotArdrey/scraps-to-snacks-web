import React, { useState, useContext } from 'react';
import { Plus, Trash2, ChefHat, Sparkles, Save, Flame, X, AlertTriangle, ShieldCheck, Pencil, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../AppContextValue';
import { usePantry } from '../hooks/usePantry';
import { useRecipes } from '../hooks/useRecipes';
import { usePreferences } from '../hooks/usePreferences';
import { generateRecipe, validateIngredient } from '../services/ai';
import ConfirmModal from '../components/ConfirmModal';
import LoadingAlert from '../components/LoadingAlert';
import { CATEGORIES, UNITS } from '../constants/categories';
import { EXPIRY_WARNING_MS } from '../constants/dietary';
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

export default function Pantry() {
  const navigate = useNavigate();
  const { user, householdId } = useContext(AppContext);
  const { pantryItems: items, loading: pantryLoading, addPantryItem, editPantryItem, removePantryItem, removePantryItems } = usePantry(user, householdId);
  const { saveRecipe } = useRecipes(user);
  const { activeDietNames, allergyTypes, userAllergies } = usePreferences(user);

  const activeAllergyNames = allergyTypes
    .filter(a => userAllergies.some(ua => ua.allergy_type_id === a.id))
    .map(a => a.name);

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
  const [editingItemId, setEditingItemId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', quantity: 1, unit: 'pcs', category: '', expiresAt: '' });
  const [savingEditId, setSavingEditId] = useState(null);
  const [editError, setEditError] = useState(null);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName) return;
    setAdding(true);
    setAddError(null);
    setAddWarning(null);

    try {
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

    setSavingEditId(itemId);
    setEditError(null);
    try {
      await editPantryItem(itemId, {
        name: cleanName,
        quantity,
        unit: editForm.unit,
        category: editForm.category || null,
        expiresAt: editForm.expiresAt || null,
      });
      setEditingItemId(null);
    } catch (err) {
      setEditError(err.message || 'Failed to update pantry item.');
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

  const handleGenerateRecipe = async () => {
    if (selectedItems.length === 0) return;
    setLoading(true);
    setGenError(null);

    try {
      const selectedItemsData = items.filter(i => selectedItems.includes(i.id));
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
        category: item.category,
        expires: item.expires,
      }));
      const recipe = await generateRecipe(ingredientList, activeDietNames.join(', ') || 'None', activeAllergyNames, pantryItems);
      setGeneratedRecipe(recipe);
    } catch (err) {
      setGenError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!generatedRecipe) return;
    await saveRecipe(generatedRecipe, 'ai');
    setGeneratedRecipe(null);
    navigate('/cookbook');
  };

  const handleDeleteItem = (itemId) => {
    const item = items.find(i => i.id === itemId);
    setConfirmDelete({ id: itemId, name: item?.name || 'this item' });
  };

  const confirmDeleteItem = async () => {
    if (!confirmDelete) return;
    await removePantryItem(confirmDelete.id);
    setSelectedItems(prev => prev.filter(id => id !== confirmDelete.id));
    setConfirmDelete(null);
  };

  const handleBatchDelete = () => {
    if (selectedItems.length === 0) return;
    setConfirmBatchDelete(true);
  };

  const confirmBatchDeleteItems = async () => {
    setConfirmBatchDelete(false);
    await removePantryItems(selectedItems);
    setSelectedItems([]);
  };

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(i => i.id));
    }
  };

  if (pantryLoading) {
    return <LoadingAlert title="Loading pantry" message="Fetching your household ingredients." />;
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

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--surface-active)' }}>
              <th style={{ padding: '1.25rem', width: '40px' }}>
                {items.length > 0 && (
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedItems.length === items.length}
                    onChange={handleSelectAll}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                    title="Select all"
                  />
                )}
              </th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Item Name</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Amount</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Category</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Expires In</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const isExpiredSoon = item.expires && new Date(item.expires) < new Date(Date.now() + EXPIRY_WARNING_MS);
              const isEditing = editingItemId === item.id;
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--surface-border)', transition: 'background var(--transition-fast)', background: 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '1.25rem' }}>
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleToggleSelect(item.id)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '1.25rem', fontWeight: '500', minWidth: isEditing ? '180px' : undefined }}>
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
                      item.name
                    )}
                  </td>
                  <td style={{ padding: '1.25rem', color: 'var(--text-secondary)', minWidth: isEditing ? '160px' : undefined }}>
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
                      `${item.quantity} ${item.unit}`
                    )}
                  </td>
                  <td style={{ padding: '1.25rem', color: 'var(--text-tertiary)', minWidth: isEditing ? '170px' : undefined }}>
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
                      item.category || '--'
                    )}
                  </td>
                  <td style={{ padding: '1.25rem', minWidth: isEditing ? '170px' : undefined }}>
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
                      <span className={isExpiredSoon ? 'badge badge-danger' : 'badge badge-success'}>
                        {item.expires}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)' }}>--</span>
                    )}
                    {isEditing && editError && (
                      <div style={{ marginTop: '0.45rem', color: '#fca5a5', fontSize: '0.78rem', whiteSpace: 'normal' }}>
                        {editError}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1.25rem', textAlign: 'right' }}>
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
                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  Your pantry is currently empty. Scan a receipt or add items manually!
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {items.length > 0 && (
          <div className="pantry-table-actions" style={{ padding: '1.5rem', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
            {genError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.9rem', flex: 1 }}>
                <AlertTriangle size={16} /> {genError}
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
              onClick={handleGenerateRecipe}
              disabled={loading || selectedItems.length === 0}
              className="btn-primary"
              style={{ padding: '0.9rem 1.5rem', opacity: selectedItems.length === 0 ? 0.6 : 1, cursor: selectedItems.length === 0 ? 'not-allowed' : 'pointer' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={18} style={{ animation: 'spin 2s linear infinite' }} /> Generating with AI...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ChefHat size={18} /> Generate Recipe ({selectedItems.length})
                </span>
              )}
            </button>
          </div>
        )}
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

      {generatedRecipe && (
        <div style={{
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
          <div className="glass-card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', animation: 'slideUpFade 0.3s ease-out', padding: '2.5rem' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: 'linear-gradient(to right, var(--primary-color), var(--secondary-color))' }}></div>

            <button
              onClick={() => setGeneratedRecipe(null)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem' }}
            >
              <X size={24} />
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', paddingRight: '3rem' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
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
