import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../AppContext';
import { usePreferences } from '../hooks/usePreferences';
import { modernStyles } from '../styles';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, isOnboarded, refreshProfile } = useContext(AppContext);
  const { dietTypes, allergyTypes, userDiets, userAllergies, loading: prefsLoading, savePreferences } = usePreferences(user);
  const [selectedDiets, setSelectedDiets] = useState(new Set());
  const [selectedAllergies, setSelectedAllergies] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!prefsLoading && !initialized) {
      if (userDiets.length > 0) setSelectedDiets(new Set(userDiets));
      if (userAllergies.length > 0) setSelectedAllergies(new Set(userAllergies));
      setInitialized(true);
    }
  }, [prefsLoading, userDiets, userAllergies, initialized]);

  const toggleDiet = (id) => {
    setSelectedDiets(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllergy = (id) => {
    setSelectedAllergies(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleComplete = async () => {
    setSaving(true);
    await savePreferences([...selectedDiets], [...selectedAllergies]);
    await refreshProfile();
    setSaving(false);
    navigate(isOnboarded ? '/account' : '/pantry');
  };

  if (prefsLoading) {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading preferences...</p>
      </div>
    );
  }

  return (
    <div style={{ ...modernStyles.container, alignItems: 'flex-start', paddingTop: '4rem', backgroundImage: 'url("https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=2070&auto=format&fit=crop")', backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat' }}>
      <div style={{ ...modernStyles.card, maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 1rem 0', background: 'linear-gradient(135deg, #f97316, #f43f5e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Diet & Allergies</h2>
          <p style={{ fontSize: '1.125rem', color: '#6b7280', margin: '0' }}>Tell us about your preferences to personalize your recipes.</p>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '2.5rem', marginBottom: '2rem' }}>
          <h4 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', color: '#f97316' }}>Diets</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {dietTypes.map(diet => (
              <label key={diet.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: selectedDiets.has(diet.id) ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255,255,255,0.5)', padding: '0.75rem 1.25rem', borderRadius: '9999px', cursor: 'pointer', transition: 'background 0.2s', border: selectedDiets.has(diet.id) ? '1px solid #f97316' : '1px solid transparent' }}>
                <input
                  type="checkbox"
                  checked={selectedDiets.has(diet.id)}
                  onChange={() => toggleDiet(diet.id)}
                  style={{ accentColor: '#f97316', width: '1.2rem', height: '1.2rem' }}
                /> {diet.name}
              </label>
            ))}
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '2.5rem', marginBottom: '3rem' }}>
          <h4 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', color: '#f43f5e' }}>Allergies</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {allergyTypes.map(allergy => (
              <label key={allergy.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: selectedAllergies.has(allergy.id) ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255,255,255,0.5)', padding: '0.75rem 1.25rem', borderRadius: '9999px', cursor: 'pointer', transition: 'background 0.2s', border: selectedAllergies.has(allergy.id) ? '1px solid #f43f5e' : '1px solid transparent' }}>
                <input
                  type="checkbox"
                  checked={selectedAllergies.has(allergy.id)}
                  onChange={() => toggleAllergy(allergy.id)}
                  style={{ accentColor: '#f43f5e', width: '1.2rem', height: '1.2rem' }}
                /> {allergy.name}
              </label>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={handleComplete} disabled={saving} style={{ padding: '1rem 3rem', fontSize: '1.1rem', fontWeight: 'bold', border: 'none', borderRadius: '9999px', background: 'linear-gradient(135deg, #f97316, #f43f5e)', color: '#ffffff', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : isOnboarded ? 'Save Preferences' : 'Complete Onboarding'}
          </button>
        </div>
      </div>
    </div>
  );
}
