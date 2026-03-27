import React, { useState, useContext } from 'react';
import { Plus, Trash2, ChefHat, Sparkles, Save, Flame, X, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../AppContext';
import { usePantry } from '../hooks/usePantry';
import { useRecipes } from '../hooks/useRecipes';
import { usePreferences } from '../hooks/usePreferences';
import { generateRecipe } from '../services/groqService';

export default function PantryPage() {
  const navigate = useNavigate();
  const { user, householdId } = useContext(AppContext);
  const { pantryItems: items, loading: pantryLoading, addPantryItem, removePantryItem } = usePantry(user, householdId);
  const { saveRecipe } = useRecipes(user);
  const { activeDietName, allergyTypes, userAllergies } = usePreferences(user);

  const activeAllergyNames = allergyTypes
    .filter(a => userAllergies.some(ua => ua.allergy_type_id === a.id))
    .map(a => a.name);

  const [newItemName, setNewItemName] = useState('');
  const [newItemExpires, setNewItemExpires] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState(null);
  const [genError, setGenError] = useState(null);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName) return;
    setAdding(true);
    await addPantryItem({
      name: newItemName,
      quantity: 1,
      unit: 'pcs',
      expiresAt: newItemExpires || null,
    });
    setNewItemName('');
    setNewItemExpires('');
    setAdding(false);
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
      const ingredientList = selectedItemsData.map(i => `${i.quantity} ${i.unit} ${i.name}`);
      const recipe = await generateRecipe(ingredientList, activeDietName, activeAllergyNames);
      setGeneratedRecipe(recipe);
    } catch (err) {
      setGenError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!generatedRecipe) return;
    await saveRecipe(generatedRecipe, 'groq');
    setGeneratedRecipe(null);
    navigate('/cookbook');
  };

  const handleDeleteItem = async (itemId) => {
    await removePantryItem(itemId);
    setSelectedItems(prev => prev.filter(id => id !== itemId));
  };

  if (pantryLoading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '2rem auto', textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading pantry...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto' }}>
      
      <div style={{ 
        position: 'relative', 
        borderRadius: '24px', 
        overflow: 'hidden', 
        marginBottom: '2.5rem',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          backgroundImage: 'url("https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1974&auto=format&fit=crop")',
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
        <div style={{ position: 'relative', zIndex: 3, padding: '4rem 3rem', color: 'white' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: 'white' }}>Household Pantry</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '1.2rem', color: '#e2e8f0', margin: 0 }}>Manage your ingredients and generate recipes.</p>
            {activeDietName && activeDietName !== 'None' && (
              <span style={{ background: '#84cc16', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                Diet: {activeDietName}
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

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="input-container" style={{ flex: 2, margin: 0 }}>
            <label htmlFor="add-item" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block', fontWeight: '500' }}>Ingredient Name</label>
            <input type="text" id="add-item" className="input-field" placeholder="E.g., Apples..." value={newItemName} onChange={e => setNewItemName(e.target.value)} />
          </div>
          <div className="input-container" style={{ flex: 1, margin: 0 }}>
            <label htmlFor="add-expires" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block', fontWeight: '500' }}>Expiration (opt)</label>
            <input type="date" id="add-expires" className="input-field" value={newItemExpires} onChange={e => setNewItemExpires(e.target.value)} />
          </div>
          <button type="submit" disabled={adding} className="btn-primary" style={{ padding: '0 1.5rem', height: '44px', whiteSpace: 'nowrap', opacity: adding ? 0.7 : 1 }}>
            {adding ? 'Adding...' : <><Plus size={18} /> Add</>}
          </button>
        </form>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--surface-active)' }}>
              <th style={{ padding: '1.25rem', width: '40px' }}></th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Item Name</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Amount</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Category</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Expires In</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const isExpiredSoon = item.expires && new Date(item.expires) < new Date(Date.now() + 86400*3*1000);
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--surface-border)', transition: 'background var(--transition-fast)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '1.25rem' }}>
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleToggleSelect(item.id)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '1.25rem', fontWeight: '500' }}>{item.name}</td>
                  <td style={{ padding: '1.25rem', color: 'var(--text-secondary)' }}>{item.quantity} {item.unit}</td>
                  <td style={{ padding: '1.25rem', color: 'var(--text-tertiary)' }}>
                    {item.category || '--'}
                  </td>
                  <td style={{ padding: '1.25rem' }}>
                    {item.expires ? (
                      <span className={isExpiredSoon ? 'badge badge-danger' : 'badge badge-success'}>
                        {item.expires}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)' }}>--</span>
                    )}
                  </td>
                  <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                    <button onClick={() => handleDeleteItem(item.id)} className="btn-danger" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title="Remove Item">
                      <Trash2 size={16} />
                    </button>
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
          <div style={{ padding: '1.5rem', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.4)' }}>
            {genError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.9rem', flex: 1 }}>
                <AlertTriangle size={16} /> {genError}
              </div>
            )}
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

      {generatedRecipe && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255,255,255,0.4)',
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
