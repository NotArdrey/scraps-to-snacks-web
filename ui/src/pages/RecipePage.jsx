import React, { useState, useContext } from 'react';
import { Save, Sparkles, ChefHat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../AppContext';

export default function RecipePage() {
  const navigate = useNavigate();
  const { recipes, setRecipes } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState(null);

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      setRecipe({
        title: 'Spinach & Tomato Frittata',
        ingredients: ['Eggs', 'Spinach', 'Tomatoes', 'Onion'],
        instructions: [
          'Beat the eggs.',
          'Saute onion and tomatoes.',
          'Add spinach until wilted.',
          'Pour in eggs and cook until set.'
        ],
        nutrition: { cals: 320, protein: 22 }
      });
      setLoading(false);
    }, 2500);
  };

  const handleSave = () => {
    if (recipe) {
      setRecipes([...recipes, {
        id: Date.now(),
        ...recipe,
        rating: 5,
        date: new Date().toISOString().split('T')[0]
      }]);
    }
    navigate('/cookbook');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '3rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'inline-flex', background: 'rgba(236, 72, 153, 0.2)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
          <ChefHat size={32} color="var(--secondary-color)" />
        </div>
        <h2 className="page-title">Recipe Generator</h2>
        <p className="page-subtitle">Select ingredients from your pantry to generate a recipe mindful of your constraints.</p>
      </div>

      {!recipe && (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <button onClick={handleGenerate} disabled={loading} className="btn-primary" style={{ padding: '1.25rem 3rem', fontSize: '1.2rem', minWidth: '300px' }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Sparkles size={20} style={{ animation: 'spin 2s linear infinite' }} /> Consulting Groq LLM...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Sparkles size={20} /> Generate with Groq LLM
              </span>
            )}
          </button>
        </div>
      )}

      {recipe && (
        <div className="glass-card" style={{ animation: 'slideUpFade var(--transition-slow) ease-out', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: 'linear-gradient(to right, var(--primary-color), var(--secondary-color))' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-primary)' }}>{recipe.title}</h2>
            <button onClick={handleSave} className="btn-primary" style={{ padding: '0.5rem 1.5rem' }}>
              <Save size={18} /> Save Recipe
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary-color)', fontSize: '1.2rem' }}>Ingredients</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recipe.ingredients.map(ing => (
                  <li key={ing} style={{ padding: '0.5rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--secondary-color)' }}></div> {ing}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '1.2rem' }}>Instructions</h4>
              {recipe.instructions.map((step, idx) => (
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
      )}
    </div>
  );
}
