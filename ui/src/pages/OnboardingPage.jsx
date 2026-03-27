import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function OnboardingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '600px', margin: '3rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 className="page-title">Diet & Allergies</h2>
        <p className="page-subtitle">Tell us about your preferences to personalize your recipes.</p>
      </div>
      
      <div className="glass-panel" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
        <h4 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', color: 'var(--primary-color)' }}>Diets</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {['Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Pescatarian'].map(diet => (
            <label key={diet} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-active)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', transition: 'background var(--transition-fast)' }}>
              <input type="checkbox" style={{ accentColor: 'var(--primary-color)', width: '1.2rem', height: '1.2rem' }} /> {diet}
            </label>
          ))}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2.5rem', marginBottom: '3rem' }}>
        <h4 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', color: 'var(--secondary-color)' }}>Allergies</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {['Nuts', 'Dairy', 'Shellfish', 'Gluten', 'Eggs', 'Soy'].map(allergy => (
            <label key={allergy} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-active)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', transition: 'background var(--transition-fast)' }}>
              <input type="checkbox" style={{ accentColor: 'var(--secondary-color)', width: '1.2rem', height: '1.2rem' }} /> {allergy}
            </label>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button onClick={() => navigate('/pantry')} className="btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>
          Complete Onboarding
        </button>
      </div>
    </div>
  );
}
