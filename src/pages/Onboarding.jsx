import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../AppContextValue';
import { usePreferences } from '../hooks/usePreferences';
import BrandIcon from '../components/BrandIcon';
import ThemeToggle from '../components/ThemeToggle';
import LoadingAlert from '../components/LoadingAlert';
import { ArrowLeft, Check, Leaf, Settings, ShieldAlert } from 'lucide-react';
import { CAROUSEL_IMAGES, CAROUSEL_INTERVAL_MS, HERO_IMAGES } from '../constants/images';

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
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (prefsLoading || initialized) return undefined;

    const timeoutId = setTimeout(() => {
      if (userDiets.length > 0) setSelectedDiets(new Set(userDiets));
      if (userAllergies.length > 0) {
        setSelectedAllergies(new Set(userAllergies.map(allergy => allergy.allergy_type_id)));
      }
      setInitialized(true);
    }, 0);

    return () => clearTimeout(timeoutId);
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
    if (saving) return;
    setSaving(true);
    try {
      await savePreferences([...selectedDiets], [...selectedAllergies], { refresh: !isOnboarded, markOnboarded: !isOnboarded });
      if (!isOnboarded) await refreshProfile();
      navigate(isOnboarded ? '/account' : '/pantry');
    } finally {
      setSaving(false);
    }
  };

  if (prefsLoading) {
    if (isOnboarded) {
      return (
        <div style={{ maxWidth: '760px', margin: '3rem auto' }}>
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

          <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', marginBottom: '2.5rem', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("${HERO_IMAGES.account}")`, backgroundPosition: 'center', backgroundSize: 'cover', zIndex: 1 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.82), rgba(0,0,0,0.28))', zIndex: 2 }} />
            <div style={{ position: 'relative', zIndex: 3, padding: '3.5rem 2.5rem', color: 'white', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1.25rem', borderRadius: '50%', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <Settings size={36} color="white" />
              </div>
              <div>
                <h2 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 0.25rem 0', color: 'white' }}>Preferences</h2>
                <p style={{ fontSize: '1.1rem', color: '#e2e8f0', margin: 0 }}>Manage diet choices and allergy exclusions</p>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)', overflow: 'hidden', border: '1px solid var(--border-color)', padding: '1.75rem', color: 'var(--theme-text-muted)' }}>
            Loading preferences...
          </div>
        </div>
      );
    }

    return <LoadingAlert title="Loading preferences" message="Fetching your diet and allergy options." />;
  }

  if (isOnboarded) {
    const panelStyle = {
      background: 'var(--bg-card)',
      borderRadius: '24px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
      overflow: 'hidden',
      border: '1px solid var(--border-color)'
    };

    const sectionStyle = {
      padding: '1.75rem',
    };

    const dividerStyle = {
      height: '1px',
      background: 'var(--border-color)',
      margin: '0 1.75rem',
    };

    const optionGridStyle = {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '0.75rem',
    };

    const preferenceOptionStyle = (selected, color) => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.75rem',
      minHeight: '52px',
      padding: '0.85rem 1rem',
      borderRadius: '12px',
      border: selected ? `1px solid ${color}` : '1px solid var(--border-color)',
      background: selected ? `${color}22` : 'transparent',
      color: selected ? 'var(--theme-text-main)' : 'var(--theme-text-muted)',
      cursor: 'pointer',
      fontWeight: selected ? 700 : 500,
      transition: 'background 0.15s, border-color 0.15s, color 0.15s',
    });

    const checkedIconStyle = (selected, color) => ({
      width: '22px',
      height: '22px',
      borderRadius: '50%',
      border: selected ? 'none' : '2px solid var(--border-color)',
      background: selected ? color : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    });

    return (
      <div style={{ maxWidth: '760px', margin: '3rem auto' }}>
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

        <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', marginBottom: '2.5rem', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("${HERO_IMAGES.account}")`, backgroundPosition: 'center', backgroundSize: 'cover', zIndex: 1 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.82), rgba(0,0,0,0.28))', zIndex: 2 }} />
          <div style={{ position: 'relative', zIndex: 3, padding: '3.5rem 2.5rem', color: 'white', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1.25rem', borderRadius: '50%', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <Settings size={36} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 0.25rem 0', color: 'white' }}>Preferences</h2>
              <p style={{ fontSize: '1.1rem', color: '#e2e8f0', margin: 0 }}>Manage diet choices and allergy exclusions</p>
            </div>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={sectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(122, 94, 211, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Leaf size={20} color="#7a5ed3" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Diets</div>
                <div style={{ fontSize: '1rem', color: 'var(--theme-text-main)', fontWeight: 600 }}>Recipe personalization</div>
              </div>
            </div>

            <div style={optionGridStyle}>
              {dietTypes.map(diet => {
                const selected = selectedDiets.has(diet.id);
                return (
                  <button
                    key={diet.id}
                    type="button"
                    onClick={() => toggleDiet(diet.id)}
                    style={preferenceOptionStyle(selected, '#7a5ed3')}
                  >
                    <span>{diet.name}</span>
                    <span style={checkedIconStyle(selected, '#7a5ed3')}>
                      {selected && <Check size={13} color="#ffffff" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={dividerStyle} />

          <div style={sectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldAlert size={20} color="#ef4444" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Allergies</div>
                <div style={{ fontSize: '1rem', color: 'var(--theme-text-main)', fontWeight: 600 }}>Exclude from recipes</div>
              </div>
            </div>

            <div style={optionGridStyle}>
              {allergyTypes.map(allergy => {
                const selected = selectedAllergies.has(allergy.id);
                return (
                  <button
                    key={allergy.id}
                    type="button"
                    onClick={() => toggleAllergy(allergy.id)}
                    style={preferenceOptionStyle(selected, '#ef4444')}
                  >
                    <span>{allergy.name}</span>
                    <span style={checkedIconStyle(selected, '#ef4444')}>
                      {selected && <Check size={13} color="#ffffff" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={dividerStyle} />

          <div style={{ padding: '1.5rem 1.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate('/account')}
              style={{
                padding: '0.7rem 1.75rem',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--theme-text-muted)',
                borderRadius: '9999px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={saving}
              style={{
                padding: '0.7rem 1.75rem',
                background: '#7a5ed3',
                color: '#fff',
                border: 'none',
                borderRadius: '9999px',
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                opacity: saving ? 0.7 : 1,
              }}
            >
              Save Preferences
            </button>
          </div>
        </div>
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
