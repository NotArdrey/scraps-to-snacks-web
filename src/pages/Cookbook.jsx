import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { Book, Calendar, Trash2, Edit2, Save, X, Flame, Plus, Minus, ChefHat } from 'lucide-react';
import { AppContext } from '../AppContextValue';
import { useRecipes } from '../hooks/useRecipes';
import ConfirmModal from '../components/ConfirmModal';
import FeedbackModal from '../components/FeedbackModal';
import BrandIcon from '../components/BrandIcon';
import CookbookChatbot from '../components/CookbookChatbot';
import LoadingPanel from '../components/LoadingPanel';

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function Cookbook() {
  const { user } = useContext(AppContext);
  const { savedRecipes: recipes, loading: recipesLoading, deleteRecipe, deleteRecipes, updateRecipe } = useRecipes(user);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', ingredients: [], instructions: [] });
  const [savingId, setSavingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
  const [confirmEdit, setConfirmEdit] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const handleDelete = (recipe) => {
    setConfirmDelete({ id: recipe.id, title: recipe.title });
  };

  const confirmDeleteRecipe = async () => {
    if (!confirmDelete) return;
    const recipeTitle = confirmDelete.title;
    try {
      await deleteRecipe(confirmDelete.id);
      if (editingId === confirmDelete.id) setEditingId(null);
      setSelectedIds(prev => prev.filter(id => id !== confirmDelete.id));
      setFeedback({
        title: 'Recipe deleted',
        message: `"${recipeTitle}" was removed from your cookbook.`,
        variant: 'success',
      });
    } catch (err) {
      setFeedback({
        title: 'Delete failed',
        message: err.message || `Unable to delete "${recipeTitle}". Please try again.`,
        variant: 'error',
      });
    }
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
    const recipeCount = selectedIds.length;
    setConfirmBatchDelete(false);
    try {
      await deleteRecipes(selectedIds);
      setSelectedIds([]);
      setEditingId(null);
      setFeedback({
        title: 'Recipes deleted',
        message: `${recipeCount} recipe${recipeCount !== 1 ? 's were' : ' was'} removed from your cookbook.`,
        variant: 'success',
      });
    } catch (err) {
      setFeedback({
        title: 'Delete failed',
        message: err.message || 'Unable to delete the selected recipes. Please try again.',
        variant: 'error',
      });
    }
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

    setConfirmEdit({
      recipe,
      payload: {
        title,
        instructions: editForm.instructions.map(s => s.trim()).filter(Boolean),
        ingredientNames,
      },
    });
  };

  const confirmSaveEdit = async () => {
    if (!confirmEdit) return;
    const { recipe, payload } = confirmEdit;
    setConfirmEdit(null);
    setSavingId(recipe.id);
    try {
      await updateRecipe(recipe.recipeId, recipe.id, payload);
      setEditingId(null);
      setFeedback({
        title: 'Recipe updated',
        message: `"${payload.title}" was saved successfully.`,
        variant: 'success',
      });
    } catch (err) {
      setFeedback({
        title: 'Update failed',
        message: err.message || `Unable to update "${payload.title}". Please try again.`,
        variant: 'error',
      });
    } finally {
      setSavingId(null);
    }
  };

  const closeFeedback = () => setFeedback(null);

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
    return <LoadingPanel title="Loading cookbook" message="Fetching your saved recipes." />;
  }

  const totalIngredients = recipes.reduce((count, recipe) => count + (recipe.ingredients?.length || 0), 0);
  const totalSteps = recipes.reduce((count, recipe) => count + (recipe.instructions?.length || 0), 0);
  const recipesWithCalories = recipes.filter(recipe => recipe.nutrition?.cals).length;
  const latestRecipeDate = recipes[0]?.date || 'No saves yet';

  return (
    <div className="cookbook-page">
      <section className="cookbook-command-header" aria-labelledby="cookbook-title">
        <div className="cookbook-command-icon" aria-hidden="true">
          <Book size={28} />
        </div>
        <div className="cookbook-command-copy">
          <span className="cookbook-kicker">Recipe library</span>
          <h1 id="cookbook-title">Cookbook</h1>
          <p>Saved AI recipes stay editable, searchable by eye, and ready for kitchen decisions.</p>
          <div className="cookbook-chip-row">
            <span>{pluralize(recipes.length, 'saved recipe')}</span>
            <span>{pluralize(selectedIds.length, 'selected recipe')}</span>
            {editingId && <span className="warning">Editing in progress</span>}
          </div>
        </div>
      </section>

      <section className="cookbook-stat-grid" aria-label="Cookbook overview">
        <div className="cookbook-stat-card">
          <span>Total recipes</span>
          <strong>{recipes.length}</strong>
          <small>{latestRecipeDate}</small>
        </div>
        <div className="cookbook-stat-card">
          <span>Ingredients filed</span>
          <strong>{totalIngredients}</strong>
          <small>Across saved recipes</small>
        </div>
        <div className="cookbook-stat-card">
          <span>Instruction steps</span>
          <strong>{totalSteps}</strong>
          <small>Editable cooking flow</small>
        </div>
        <div className="cookbook-stat-card">
          <span>Nutrition data</span>
          <strong>{recipesWithCalories}</strong>
          <small>{pluralize(recipesWithCalories, 'recipe')} with calories</small>
        </div>
      </section>

      {recipes.length === 0 ? (
        <section className="cookbook-empty-panel">
          <div aria-hidden="true">
            <BrandIcon size={56} />
          </div>
          <h2>Your cookbook is empty</h2>
          <p>Generate a recipe from safe pantry items, then save it here for editing and reuse.</p>
          <Link to="/pantry" className="btn-primary">
            <ChefHat size={17} /> Open pantry
          </Link>
        </section>
      ) : (
        <>
          <section className="cookbook-toolbar" aria-label="Cookbook batch actions">
            <label className="cookbook-select-all">
              <input
                type="checkbox"
                checked={recipes.length > 0 && selectedIds.length === recipes.length}
                onChange={handleSelectAll}
                className="cookbook-checkbox"
              />
              <span>Select all recipes</span>
            </label>
            <div className="cookbook-toolbar-summary">
              {selectedIds.length > 0 ? `${pluralize(selectedIds.length, 'recipe')} selected` : 'No recipes selected'}
            </div>
            {selectedIds.length > 0 && (
              <button onClick={handleBatchDelete} className="btn-danger cookbook-batch-delete">
                <Trash2 size={16} /> Delete selected
              </button>
            )}
          </section>

          <div className="grid-container cookbook-grid">
            {recipes.map(recipe => (
              <article key={recipe.id} className={`glass-card cookbook-card${editingId === recipe.id ? ' editing' : ''}`}>
                <label className="cookbook-card-select" title="Select recipe">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(recipe.id)}
                    onChange={() => handleToggleSelect(recipe.id)}
                    className="cookbook-checkbox"
                    aria-label={`Select ${recipe.title}`}
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
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="input-field cookbook-title-input"
                      placeholder="Recipe title"
                    />
                  </div>
                ) : (
                  <div className="cookbook-card-header">
                    <span className="cookbook-card-kicker">Saved recipe</span>
                    <h3 className="cookbook-card-title">{recipe.title}</h3>
                  </div>
                )}

                <div className="cookbook-meta">
                  <span className="cookbook-meta-item"><Calendar size={16} /> Saved: {recipe.date}</span>
                  {recipe.nutrition?.cals && (
                    <span className="cookbook-meta-item cookbook-calories">
                      <Flame size={16} />
                      <span>{recipe.nutrition.cals} kcal</span>
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

      <ConfirmModal
        open={!!confirmEdit}
        title="Save Recipe Changes"
        message={`Save your changes to "${confirmEdit?.payload?.title}"?`}
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
        onClose={closeFeedback}
      />

      <CookbookChatbot recipes={recipes} loading={recipesLoading} />
    </div>
  );
}
