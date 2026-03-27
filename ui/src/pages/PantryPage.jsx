import React, { useState, useContext } from 'react';
import { Plus, Trash2, ChefHat, Sparkles, Save, Flame, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../AppContext';

export default function PantryPage() {
  const navigate = useNavigate();
  const { pantryItems: items, setPantryItems: setItems, recipes, setRecipes, dietOption, setDietOption } = useContext(AppContext);

  const [newItemName, setNewItemName] = useState('');
  const [newItemCalories, setNewItemCalories] = useState('');
  const [newItemExpires, setNewItemExpires] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState(null);

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemName) return;
    setItems([
      ...items, 
      { 
        id: Date.now(), 
        name: newItemName, 
        quantity: 1, 
        unit: 'pcs', 
        expires: newItemExpires || '2026-04-01', 
        status: 'available',
        calories: newItemCalories ? parseInt(newItemCalories, 10) : null
      }
    ]);
    setNewItemName('');
    setNewItemCalories('');
    setNewItemExpires('');
  };

  const handleToggleSelect = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleGenerateRecipe = () => {
    if (selectedItems.length === 0) return;
    setLoading(true);
    setTimeout(() => {
      const selectedItemsData = items.filter(i => selectedItems.includes(i.id));
      const itemNames = selectedItemsData.map(i => i.name);
      
      // Calculate total calories (default 50 per item if not specified)
      const totalCals = selectedItemsData.reduce((sum, item) => sum + (item.calories || 50), 0);
      
      // Incorporate diet option into title
      const dietPrefix = dietOption !== 'None' ? `${dietOption} ` : '';
      const formattedIngredients = selectedItemsData.map(i => `${i.quantity} ${i.unit} ${i.name}`);

      setGeneratedRecipe({
        title: `${dietPrefix}Custom ` + itemNames.slice(0, 2).join(' & ') + ' Dish',
        ingredients: [...formattedIngredients, '1 tsp Salt', '1/2 tsp Pepper', '2 tbsp Olive Oil'],
        instructions: [
          `Prepare the ingredients: wash and chop the ${itemNames.join(' and ')}.`,
          `Heat 2 tbsp Olive Oil in a large pan over medium heat.`,
          `Add the ${itemNames.join(', ')} to the pan and sauté until tender.`,
          `Season with 1 tsp Salt and 1/2 tsp Pepper, stir well.`,
          `Serve warm and enjoy your custom ${dietPrefix.toLowerCase()}meal!`
        ],
        nutrition: { cals: totalCals, protein: 18 }
      });
      setLoading(false);
    }, 2500);
  };

  const handleSaveRecipe = () => {
    if (generatedRecipe) {
      setRecipes([...recipes, {
        id: Date.now(),
        ...generatedRecipe,
        rating: 5,
        date: new Date().toISOString().split('T')[0]
      }]);
    }
    navigate('/cookbook');
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 className="page-title" style={{ fontSize: '2rem', textAlign: 'left' }}>Household Pantry</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <p className="page-subtitle" style={{ textAlign: 'left', margin: 0 }}>Manage your ingredients and generate recipes.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.5)', padding: '0.3rem 0.8rem', borderRadius: '1rem' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Diet:</label>
              <select 
                value={dietOption} 
                onChange={(e) => setDietOption(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}
              >
                <option value="None">None</option>
                <option value="Vegetarian">Vegetarian</option>
                <option value="Vegan">Vegan</option>
                <option value="Keto">Keto</option>
                <option value="Paleo">Paleo</option>
              </select>
            </div>
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
            <label htmlFor="add-calories" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block', fontWeight: '500' }}>Calories (opt)</label>
            <input type="number" id="add-calories" className="input-field" placeholder="Kcal" value={newItemCalories} onChange={e => setNewItemCalories(e.target.value)} />
          </div>
          <div className="input-container" style={{ flex: 1, margin: 0 }}>
            <label htmlFor="add-expires" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block', fontWeight: '500' }}>Expiration (opt)</label>
            <input type="date" id="add-expires" className="input-field" value={newItemExpires} onChange={e => setNewItemExpires(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '0 1.5rem', height: '44px', whiteSpace: 'nowrap' }}>
            <Plus size={18} /> Add
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
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Calories</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Expires In</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const isExpiredSoon = new Date(item.expires) < new Date(Date.now() + 86400*3*1000);
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
                  <td style={{ padding: '1.25rem', color: '#ff7b72' }}>
                    {item.calories ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><Flame size={16} style={{ display: 'block' }} /> <span style={{ lineHeight: 1 }}>{item.calories} kcal</span></span> : <span style={{ color: 'var(--text-tertiary)' }}>--</span>}
                  </td>
                  <td style={{ padding: '1.25rem' }}>
                    <span className={isExpiredSoon ? 'badge badge-danger' : 'badge badge-success'}>
                      {item.expires}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                    <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="btn-danger" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title="Remove Item">
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
          <div style={{ padding: '1.5rem', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'flex-end', background: 'rgba(255,255,255,0.4)' }}>
            <button 
              onClick={handleGenerateRecipe} 
              disabled={loading || selectedItems.length === 0} 
              className="btn-primary" 
              style={{ padding: '0.9rem 1.5rem', opacity: selectedItems.length === 0 ? 0.6 : 1, cursor: selectedItems.length === 0 ? 'not-allowed' : 'pointer' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={18} style={{ animation: 'spin 2s linear infinite' }} /> Generating...
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
                <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center', color: '#ff7b72', marginTop: '0.5rem' }}>
                  <Flame size={20} style={{ display: 'block' }} /> 
                  <strong style={{ lineHeight: 1, position: 'relative', top: '1px' }}>{generatedRecipe.nutrition.cals} kcal</strong>
                </div>
              </div>
              <button onClick={handleSaveRecipe} className="btn-primary" style={{ padding: '0.5rem 1.5rem', whiteSpace: 'nowrap' }}>
                <Save size={18} /> Save Recipe
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
              <div style={{ background: 'var(--surface-active)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary-color)', fontSize: '1.2rem' }}>Ingredients</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {generatedRecipe.ingredients.map(ing => (
                    <li key={ing} style={{ padding: '0.5rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
