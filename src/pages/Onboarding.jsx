import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../AppContext';
import { usePreferences } from '../hooks/usePreferences';
import BrandIcon from '../components/BrandIcon';
import ThemeToggle from '../components/ThemeToggle';
import { ArrowLeft } from 'lucide-react';

const CAROUSEL_IMAGES = [
  'https://images.unsplash.com/photo-1543362906-acfc16c67564?q=80&w=2000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=2000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1466637574441-749b8f19452f?q=80&w=2000&auto=format&fit=crop'
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, isOnboarded, refreshProfile } = useContext(AppContext);
  const { dietTypes, allergyTypes, userDiets, userAllergies, loading: prefsLoading, savePreferences } = usePreferences(user);
  const [selectedDiets, setSelectedDiets] = useState(new Set());
  const [selectedAllergies, setSelectedAllergies] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)', color: 'var(--theme-text-main)', zIndex: 50 }}>
        <p style={{ color: 'var(--theme-text-muted)' }}>Loading preferences...</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', minHeight: '100vh', display: 'flex', backgroundColor: 'var(--bg-main)', color: 'var(--theme-text-main)', fontFamily: 'Outfit, sans-serif', zIndex: 50 }}>
      <ThemeToggle style={{ right: 'auto', left: '1.5rem' }} />
      {/* Left Side - Form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '3rem 4rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
          {isOnboarded && (
            <button onClick={() => navigate('/account')} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'none', border: 'none', color: 'var(--theme-text-muted)',
              cursor: 'pointer', fontSize: '0.95rem', padding: 0, marginBottom: '1.5rem',
              transition: 'color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--theme-text-main)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--theme-text-muted)'}
            >
              <ArrowLeft size={18} /> Back to Account
            </button>
          )}
          <h2 style={{ fontSize: '2.5rem', fontWeight: '600', margin: '0 0 0.5rem 0' }}>Diet & Allergies</h2>
          <p style={{ color: 'var(--theme-text-muted)', margin: '0 0 3rem 0', fontSize: '1rem' }}>
            Tell us about your preferences to personalize your recipes.
          </p>

          <div style={{ marginBottom: '2.5rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--theme-text-main)', fontWeight: '500' }}>Diets</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {dietTypes.map(diet => (
                <label key={diet.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  background: selectedDiets.has(diet.id) ? 'rgba(122, 94, 211, 0.15)' : 'var(--bg-card)', 
                  padding: '0.75rem 1.25rem', 
                  borderRadius: '9999px', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s', 
                  border: selectedDiets.has(diet.id) ? '1px solid #7a5ed3' : '1px solid var(--border-color)',
                  color: selectedDiets.has(diet.id) ? 'var(--theme-text-main)' : 'var(--theme-text-muted)'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedDiets.has(diet.id)}
                    onChange={() => toggleDiet(diet.id)}
                    style={{ accentColor: '#7a5ed3', width: '1.2rem', height: '1.2rem', margin: 0 }}
                  /> {diet.name}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '3rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--theme-text-main)', fontWeight: '500' }}>Allergies (exclude from recipes)</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {allergyTypes.map(allergy => (
                <label key={allergy.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  background: selectedAllergies.has(allergy.id) ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-card)', 
                  padding: '0.75rem 1.25rem', 
                  borderRadius: '9999px', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s', 
                  border: selectedAllergies.has(allergy.id) ? '1px solid #ef4444' : '1px solid var(--border-color)',
                  color: selectedAllergies.has(allergy.id) ? 'var(--theme-text-main)' : 'var(--theme-text-muted)'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedAllergies.has(allergy.id)}
                    onChange={() => toggleAllergy(allergy.id)}
                    style={{ accentColor: '#ef4444', width: '1.2rem', height: '1.2rem', margin: 0 }}
                  /> {allergy.name}
                </label>
              ))}
            </div>
          </div>

          <button onClick={handleComplete} disabled={saving} style={{
            width: '100%',
            padding: '1rem',
            background: '#7a5ed3',
            color: '#ffffff',
            border: 'none', 
            borderRadius: '8px', 
            fontSize: '1rem', 
            fontWeight: '500', 
            cursor: 'pointer', 
            opacity: saving ? 0.7 : 1 
          }}>
            {saving ? 'Saving...' : isOnboarded ? 'Save Preferences' : 'Complete Onboarding'}
          </button>
        </div>
      </div>

      {/* Right Side - Image Background */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between', 
        padding: '3rem', 
        backgroundImage: `linear-gradient(to bottom, rgba(var(--bg-rgb), 0.4), rgba(var(--bg-rgb), 0.9)), url("${CAROUSEL_IMAGES[currentImageIndex]}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderTopLeftRadius: '2rem',
        borderBottomLeftRadius: '2rem',
        transition: 'background-image 1s ease-in-out'
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '1px' }}>
              Scraps<span style={{ color: '#7a5ed3' }}>2</span>Snacks
            </span>
            <BrandIcon size={32} color="#ffffff" />
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 'bold', margin: '0 0 1rem 0', lineHeight: 1.2 }}>
            Curate Your<br />Experience
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
            {CAROUSEL_IMAGES.map((_, idx) => (
              <div key={idx} style={{ height: '4px', width: '24px', backgroundColor: currentImageIndex === idx ? 'var(--theme-text-main)' : 'var(--surface-border)', borderRadius: '2px', transition: 'background-color 0.5s ease' }}></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
