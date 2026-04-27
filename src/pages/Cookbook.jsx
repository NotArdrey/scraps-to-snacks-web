import React, { useContext, useState } from 'react';
import { Book, Calendar, Trash2, Edit2, Save, X, Flame, Plus, Minus } from 'lucide-react';
import { AppContext } from '../AppContextValue';
import { useRecipes } from '../hooks/useRecipes';
import ConfirmModal from '../components/ConfirmModal';
import BrandIcon from '../components/BrandIcon';
import CookbookChatbot from '../components/CookbookChatbot';
import LoadingAlert from '../components/LoadingAlert';
import { HERO_IMAGES } from '../constants/images';

export default function Cookbook() {
  const { user } = useContext(AppContext);
  const { savedRecipes: recipes, loading: recipesLoading, deleteRecipe, deleteRecipes, updateRecipe } = useRecipes(user);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', ingredients: [], instructions: [] });
  const [savingId, setSavingId] = useState(null);
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
      ingredients: [...(recipe.ingredients || [])],
      instructions: [...(recipe.instructions || [])],
    });
  };

  const handleSaveEdit = async (recipe) => {
    const title = editForm.title.trim();
    if (!title) return;

    const ingredientNames = editForm.ingredients.map(ing => {
      return ing.replace(/^[\d./\s]+(pcs|kg|g|lbs|oz|L|mL|cups|tbsp|tsp)?\s*/i, '').trim() || ing.trim();
    }).filter(Boolean);

    setSavingId(recipe.id);
    try {
      await updateRecipe(recipe.recipeId, recipe.id, {
        title,
        instructions: editForm.instructions.map(s => s.trim()).filter(Boolean),
        ingredientNames,
      });
      setEditingId(null);
    } finally {
      setSavingId(null);
    }
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
    return <LoadingAlert title="Loading cookbook" message="Fetching your saved recipes." />;
  }

  return (
    <div className="hero-container">
      
      <div className="hero-banner">
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          backgroundImage: `url("${HERO_IMAGES.cookbook}")`,
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
          <div style={{ marginBottom: '1rem', opacity: 0.5 }}>
            <BrandIcon size={56} />
          </div>
          <h3 style={{ color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>Your cookbook is empty</h3>
          <p style={{ color: 'var(--text-tertiary)' }}>Go to your Pantry to select ingredients and generate your first custom recipe!</p>
        </div>
      ) : (
        <>
        {recipes.length > 0 && (
          <div className="cookbook-toolbar">
            <label className="cookbook-select-all">
              <input
                type="checkbox"
                checked={recipes.length > 0 && selectedIds.length === recipes.length}
                onChange={handleSelectAll}
                className="cookbook-checkbox"
              />
              <span>Select All</span>
            </label>
            {selectedIds.length > 0 && (
              <button onClick={handleBatchDelete} className="btn-danger cookbook-batch-delete">
                <Trash2 size={16} /> Delete Selected ({selectedIds.length})
              </button>
            )}
          </div>
        )}
        <div className="grid-container cookbook-grid">
          {recipes.map(recipe => (
            <article key={recipe.id} className={`glass-card cookbook-card${editingId === recipe.id ? ' editing' : ''}`}>

              <label className="cookbook-card-select" title="Select recipe">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(recipe.id)}
                  onChange={() => handleToggleSelect(recipe.id)}
                  className="cookbook-checkbox"
                />
              </label>

              <div className="cookbook-card-actions">
                {editingId === recipe.id ? (
                  <>
                    <button onClick={() => setEditingId(null)} className="btn-secondary cookbook-icon-button" title="Cancel" disabled={savingId === recipe.id}>
                      <X size={16} />
                    </button>
                    <button onClick={() => handleSaveEdit(recipe)} className="btn-primary cookbook-icon-button" title="Save" disabled={savingId === recipe.id || !editForm.title.trim()}>
                      <Save size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleEditClick(recipe)} className="btn-secondary cookbook-icon-button" title="Edit">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(recipe)} className="btn-danger cookbook-icon-button" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>

              {editingId === recipe.id ? (
                <div className="cookbook-card-header cookbook-card-header-editing">
                  <label className="cookbook-field-label" htmlFor={`recipe-title-${recipe.id}`}>Recipe title</label>
                  <input
                    id={`recipe-title-${recipe.id}`}
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    className="input-field cookbook-title-input"
                    placeholder="Recipe title"
                  />
                </div>
              ) : (
                <div className="cookbook-card-header">
                  <h3 className="cookbook-card-title">{recipe.title}</h3>
                </div>
              )}

              <div className="cookbook-meta">
                <span className="cookbook-meta-item"><Calendar size={16} /> Saved: {recipe.date}</span>
                {recipe.nutrition && recipe.nutrition.cals && (
                  <span className="cookbook-meta-item cookbook-calories">
                    <Flame size={16} />
                    <span>Calories: {recipe.nutrition.cals} kcal</span>
                  </span>
                )}
              </div>

              <div className={`cookbook-details-panel${editingId === recipe.id ? ' cookbook-details-panel-editing' : ''}${(!recipe.ingredients || recipe.ingredients.length === 0) && (!recipe.instructions || recipe.instructions.length === 0) ? ' cookbook-details-panel-empty' : ''}`}>
                {editingId === recipe.id ? (
                  <>
                    <div className="cookbook-edit-section">
                      <h4 className="cookbook-edit-heading">
                        Ingredients
                        <button type="button" onClick={addIngredient} className="btn-secondary cookbook-add-button" title="Add ingredient">
                          <Plus size={14} />
                          <span>Add</span>
                        </button>
                      </h4>
                      {editForm.ingredients.map((ing, idx) => (
                        <div key={idx} className="cookbook-edit-row">
                          <input
                            type="text"
                            value={ing}
                            onChange={(e) => updateIngredient(idx, e.target.value)}
                            className="input-field cookbook-edit-input"
                            placeholder="e.g., 2 cups flour"
                          />
                          <button type="button" onClick={() => removeIngredient(idx)} className="cookbook-remove-button" title="Remove ingredient">
                            <Minus size={16} />
                          </button>
                        </div>
                      ))}
                      {editForm.ingredients.length === 0 && (
                        <p className="cookbook-empty-edit">No ingredients yet.</p>
                      )}
                    </div>
                    <div className="cookbook-edit-section">
                      <h4 className="cookbook-edit-heading">
                        Instructions
                        <button type="button" onClick={addInstruction} className="btn-secondary cookbook-add-button" title="Add instruction">
                          <Plus size={14} />
                          <span>Add</span>
                        </button>
                      </h4>
                      {editForm.instructions.map((inst, idx) => (
                        <div key={idx} className="cookbook-edit-row cookbook-instruction-row">
                          <span className="cookbook-step-number">{idx + 1}.</span>
                          <textarea
                            value={inst}
                            onChange={(e) => updateInstruction(idx, e.target.value)}
                            className="input-field cookbook-edit-input cookbook-edit-textarea"
                            rows={3}
                            placeholder={`Step ${idx + 1}...`}
                          />
                          <button type="button" onClick={() => removeInstruction(idx)} className="cookbook-remove-button" title="Remove instruction">
                            <Minus size={16} />
                          </button>
                        </div>
                      ))}
                      {editForm.instructions.length === 0 && (
                        <p className="cookbook-empty-edit">No instructions yet.</p>
                      )}
                    </div>
                    <div className="cookbook-edit-footer">
                      <button type="button" onClick={() => setEditingId(null)} className="btn-secondary" disabled={savingId === recipe.id}>
                        <X size={16} /> Cancel
                      </button>
                      <button type="button" onClick={() => handleSaveEdit(recipe)} className="btn-primary" disabled={savingId === recipe.id || !editForm.title.trim()}>
                        <Save size={16} /> {savingId === recipe.id ? 'Saving' : 'Save changes'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                {recipe.ingredients && recipe.ingredients.length > 0 && (
                  <section className="cookbook-section">
                    <h4 className="cookbook-section-heading">Ingredients</h4>
                    <ul className="cookbook-list">
                      {recipe.ingredients.map((ing, idx) => (
                        <li key={idx}>{ing}</li>
                      ))}
                    </ul>
                  </section>
                )}
                {recipe.instructions && recipe.instructions.length > 0 && (
                  <section className="cookbook-section">
                    <h4 className="cookbook-section-heading">Instructions</h4>
                    <ol className="cookbook-list cookbook-steps">
                      {recipe.instructions.map((inst, idx) => (
                        <li key={idx}>{inst}</li>
                      ))}
                    </ol>
                  </section>
                )}
                {(!recipe.ingredients || recipe.ingredients.length === 0) && (!recipe.instructions || recipe.instructions.length === 0) && (
                  <p className="cookbook-empty-state">No detailed instructions saved.</p>
                )}
                  </>
                )}
              </div>

            </article>
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

      <CookbookChatbot recipes={recipes} loading={recipesLoading} />
    </div>
  );
}
