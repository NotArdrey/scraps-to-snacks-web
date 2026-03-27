import React, { useContext, useState } from 'react';
import { Book, Star, Calendar, Trash2, Edit2, Save, X, ChefHat, Flame } from 'lucide-react';
import { AppContext } from '../AppContext';
import { useRecipes } from '../hooks/useRecipes';

export default function CookbookPage() {
  const { user } = useContext(AppContext);
  const { savedRecipes: recipes, loading: recipesLoading, deleteRecipe, updateRecipe } = useRecipes(user);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', rating: 0 });

  const handleDelete = async (savedRecipeId) => {
    await deleteRecipe(savedRecipeId);
    if (editingId === savedRecipeId) setEditingId(null);
  };

  const handleEditClick = (recipe) => {
    setEditingId(recipe.id);
    setEditForm({ title: recipe.title, rating: recipe.rating });
  };

  const handleSaveEdit = async (recipe) => {
    await updateRecipe(recipe.recipeId, recipe.id, editForm);
    setEditingId(null);
  };

  if (recipesLoading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '3rem auto', textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading cookbook...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '3rem auto' }}>
      
      <div style={{ 
        position: 'relative', 
        borderRadius: '24px', 
        overflow: 'hidden', 
        marginBottom: '3rem',
        boxShadow: 'var(--shadow-md)'
      }}>
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
        <div style={{ position: 'relative', zIndex: 3, padding: '4rem 3rem', color: 'white', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1.25rem', borderRadius: '50%', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <Book size={40} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: '3rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: 'white' }}>My Cookbook</h2>
            <p style={{ fontSize: '1.2rem', color: '#e2e8f0', margin: 0 }}>Your saved AI recipes and cooking history.</p>
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
        <div className="grid-container">
          {recipes.map(recipe => (
            <div key={recipe.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>

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
                    <button onClick={() => handleDelete(recipe.id)} className="btn-danger" style={{ padding: '0.4rem', borderRadius: '50%' }} title="Delete">
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
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
