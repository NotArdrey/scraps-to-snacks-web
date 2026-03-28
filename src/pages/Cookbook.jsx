import React, { useContext, useState } from 'react';
import { Book, Star, Calendar, Trash2, Edit2, Save, X, ChefHat, Flame, Plus, Minus } from 'lucide-react';
import { AppContext } from '../AppContext';
import { useRecipes } from '../hooks/useRecipes';
import ConfirmModal from '../components/ConfirmModal';

export default function Cookbook() {
  const { user } = useContext(AppContext);
  const { savedRecipes: recipes, loading: recipesLoading, deleteRecipe, deleteRecipes, updateRecipe } = useRecipes(user);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', rating: 0, ingredients: [], instructions: [] });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);

  const handleDelete = (recipe) => {
    setConfirmDelete({ id: recipe.id, title: recipe.title });
  };

  const confirmDeleteRecipe = async () => {
    if (!confirmDelete) return;
    await deleteRecipe(confirmDelete.id);
    if (editingId === confirmDelete.id) setEditingId(null);
    setSelectedIds(prev => prev.filter(id => id !== confirmDelete.id));
    setConfirmDelete(null);
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === recipes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(recipes.map(r => r.id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmBatchDelete(true);
  };

  const confirmBatchDeleteRecipes = async () => {
    setConfirmBatchDelete(false);
    await deleteRecipes(selectedIds);
    setSelectedIds([]);
    setEditingId(null);
  };

  const handleEditClick = (recipe) => {
    setEditingId(recipe.id);
    setEditForm({
      title: recipe.title,
      rating: recipe.rating,
      ingredients: [...(recipe.ingredients || [])],
      instructions: [...(recipe.instructions || [])],
    });
  };

  const handleSaveEdit = async (recipe) => {
    const ingredientNames = editForm.ingredients.map(ing => {
      return ing.replace(/^[\d./\s]+(pcs|kg|g|lbs|oz|L|mL|cups|tbsp|tsp)?\s*/i, '').trim() || ing.trim();
    }).filter(Boolean);

    await updateRecipe(recipe.recipeId, recipe.id, {
      title: editForm.title,
      rating: editForm.rating,
      instructions: editForm.instructions.filter(s => s.trim()),
      ingredientNames,
    });
    setEditingId(null);
  };

  const updateIngredient = (idx, value) => {
    const updated = [...editForm.ingredients];
    updated[idx] = value;
    setEditForm({ ...editForm, ingredients: updated });
  };

  const addIngredient = () => {
    setEditForm({ ...editForm, ingredients: [...editForm.ingredients, ''] });
  };

  const removeIngredient = (idx) => {
    setEditForm({ ...editForm, ingredients: editForm.ingredients.filter((_, i) => i !== idx) });
  };

  const updateInstruction = (idx, value) => {
    const updated = [...editForm.instructions];
    updated[idx] = value;
    setEditForm({ ...editForm, instructions: updated });
  };

  const addInstruction = () => {
    setEditForm({ ...editForm, instructions: [...editForm.instructions, ''] });
  };

  const removeInstruction = (idx) => {
    setEditForm({ ...editForm, instructions: editForm.instructions.filter((_, i) => i !== idx) });
  };

  if (recipesLoading) {
    return (
      <div className="hero-container" style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading cookbook...</p>
      </div>
    );
  }

  return (
    <div className="hero-container">
      
      <div className="hero-banner">
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          backgroundImage: 'url("https://images.unsplash.com/photo-1504630083234-14187a9df0f5?q=80&w=2070&auto=format&fit=crop")',
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
            <Book size={40} color="white" />
          </div>
          <div>
            <h2 className="hero-title">My Cookbook</h2>
            <p className="hero-subtitle">Your saved AI recipes and cooking history.</p>
          </div>
        </div>
      </div>

      {recipes.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <ChefHat size={48} color="var(--text-tertiary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3 style={{ color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>Your cookbook is empty</h3>
          <p style={{ color: 'var(--text-tertiary)' }}>Go to your Pantry to select ingredients and generate your first custom recipe!</p>
        </div>
      ) : (
        <>
        {recipes.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              <input
                type="checkbox"
                checked={recipes.length > 0 && selectedIds.length === recipes.length}
                onChange={handleSelectAll}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
              />
              Select All
            </label>
            {selectedIds.length > 0 && (
              <button onClick={handleBatchDelete} className="btn-danger" style={{ padding: '0.6rem 1.2rem' }}>
                <Trash2 size={16} /> Delete Selected ({selectedIds.length})
              </button>
            )}
          </div>
        )}
        <div className="grid-container">
          {recipes.map(recipe => (
            <div key={recipe.id} className={`glass-card${editingId === recipe.id ? ' editing' : ''}`} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>

              <div style={{ position: 'absolute', top: '1rem', left: '1rem' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(recipe.id)}
                  onChange={() => handleToggleSelect(recipe.id)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                />
              </div>

              <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                {editingId === recipe.id ? (
                  <>
                    <button onClick={() => setEditingId(null)} className="btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%' }} title="Cancel">
                      <X size={16} />
                    </button>
                    <button onClick={() => handleSaveEdit(recipe)} className="btn-primary" style={{ padding: '0.4rem', borderRadius: '50%' }} title="Save">
                      <Save size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleEditClick(recipe)} className="btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%' }} title="Edit">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(recipe)} className="btn-danger" style={{ padding: '0.4rem', borderRadius: '50%' }} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>

              {editingId === recipe.id ? (
                <div style={{ marginTop: '0.5rem', marginBottom: '1.5rem', paddingRight: '4rem' }}>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    className="input-field"
                    style={{ marginBottom: '1rem', fontSize: '1.2rem', padding: '0.5rem', width: '100%', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: '0.2rem', color: '#fbbf24', cursor: 'pointer' }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={24}
                        onClick={() => setEditForm({...editForm, rating: i + 1})}
                        fill={i < editForm.rating ? '#fbbf24' : 'transparent'}
                        stroke={i < editForm.rating ? '#fbbf24' : 'var(--text-tertiary)'}
                        style={{ transition: 'transform 0.1s', cursor: 'pointer' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '0.5rem', marginBottom: '1.5rem', paddingRight: '4rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.4rem' }}>{recipe.title}</h3>
                  <div style={{ display: 'flex', gap: '0.2rem', color: '#fbbf24' }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={20} fill={i < recipe.rating ? '#fbbf24' : 'transparent'} stroke={i < recipe.rating ? '#fbbf24' : 'var(--text-tertiary)'} />
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-tertiary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Calendar size={16} /> Saved: {recipe.date}</span>
                {recipe.nutrition && recipe.nutrition.cals && (
                  <span style={{ display: 'inline-flex', gap: '0.3rem', alignItems: 'center', color: '#ff7b72' }}>
                    <Flame size={16} style={{ display: 'block' }} />
                    <span style={{ lineHeight: 1, position: 'relative', top: '1px' }}>Calories: {recipe.nutrition.cals} kcal</span>
                  </span>
                )}
              </div>

              <div style={{ background: 'var(--surface-color)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', marginTop: 'auto' }}>
                {editingId === recipe.id ? (
                  <>
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        Ingredients
                        <button type="button" onClick={addIngredient} className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Plus size={14} /> Add
                        </button>
                      </h4>
                      {editForm.ingredients.map((ing, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <input
                            type="text"
                            value={ing}
                            onChange={(e) => updateIngredient(idx, e.target.value)}
                            className="input-field"
                            style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.9rem' }}
                            placeholder="e.g., 2 cups flour"
                          />
                          <button type="button" onClick={() => removeIngredient(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', flexShrink: 0 }} title="Remove">
                            <Minus size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        Instructions
                        <button type="button" onClick={addInstruction} className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Plus size={14} /> Add
                        </button>
                      </h4>
                      {editForm.instructions.map((inst, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', minWidth: '20px', paddingTop: '0.5rem' }}>{idx + 1}.</span>
                          <textarea
                            value={inst}
                            onChange={(e) => updateInstruction(idx, e.target.value)}
                            className="input-field"
                            rows={2}
                            style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.9rem', resize: 'vertical' }}
                            placeholder={`Step ${idx + 1}...`}
                          />
                          <button type="button" onClick={() => removeInstruction(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', flexShrink: 0, marginTop: '0.3rem' }} title="Remove">
                            <Minus size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                {recipe.ingredients && recipe.ingredients.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Ingredients</h4>
                    <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
                      {recipe.ingredients.map((ing, idx) => (
                        <li key={idx} style={{ marginBottom: '0.25rem' }}>{ing}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {recipe.instructions && recipe.instructions.length > 0 && (
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Instructions</h4>
                    <ol style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
                      {recipe.instructions.map((inst, idx) => (
                        <li key={idx} style={{ marginBottom: '0.25rem' }}>{inst}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {(!recipe.ingredients || recipe.ingredients.length === 0) && (!recipe.instructions || recipe.instructions.length === 0) && (
                  <p style={{ color: 'var(--text-tertiary)', margin: 0, fontStyle: 'italic' }}>No detailed instructions saved.</p>
                )}
                  </>
                )}
              </div>

            </div>
          ))}
        </div>
        </>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Recipe"
        message={`Are you sure you want to delete "${confirmDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={confirmDeleteRecipe}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmModal
        open={confirmBatchDelete}
        title="Delete Selected Recipes"
        message={`Are you sure you want to delete ${selectedIds.length} recipe${selectedIds.length !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText="Delete All"
        variant="danger"
        onConfirm={confirmBatchDeleteRecipes}
        onCancel={() => setConfirmBatchDelete(false)}
      />
    </div>
  );
}
