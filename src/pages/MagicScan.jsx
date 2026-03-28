import React, { useState, useContext, useRef } from 'react';
import { Camera, Check, AlertTriangle, FileImage, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../AppContext';
import { usePantry } from '../hooks/usePantry';
import { usePreferences } from '../hooks/usePreferences';
import { scanIngredientsFromImage, validateIngredient } from '../services/groq';
import ConfirmModal from '../components/ConfirmModal';
import { UNITS } from '../constants/categories';
import { HERO_IMAGES } from '../constants/images';

export default function MagicScan() {
  const navigate = useNavigate();
  const { user, householdId } = useContext(AppContext);
  const { addPantryItem } = usePantry(user, householdId);
  const { activeDietNames, allergyTypes, userAllergies } = usePreferences(user);
  const fileInputRef = useRef(null);
  const prevPreviewRef = useRef(null);

  const activeAllergyNames = allergyTypes
    .filter(a => userAllergies.some(ua => ua.allergy_type_id === a.id))
    .map(a => a.name);

  const [status, setStatus] = useState('idle');
  const [detections, setDetections] = useState([]);
  const [saving, setSaving] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [filteredCount, setFilteredCount] = useState(0);

  if (!user || !householdId) {
    return (
      <div className="hero-container">
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', marginTop: '3rem' }}>
          <AlertTriangle size={48} color="var(--text-tertiary)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Sign in Required</h3>
          <p style={{ color: 'var(--text-tertiary)', marginBottom: '1.5rem' }}>You need to be signed in with a household to use Magic Scan.</p>
          <button onClick={() => navigate('/login')} className="btn-primary">Sign In</button>
        </div>
      </div>
    );
  }

  const enrichDetections = async (rawItems) => {
    const enriched = await Promise.all(
      rawItems.map(async (d) => {
        try {
          const v = await validateIngredient(d.name, activeDietNames.join(', ') || 'None', activeAllergyNames);
          if (!v.isFood) return null;
          return {
            ...d,
            name: v.correctedName || d.name,
            category: v.category || null,
            expiresAt: v.estimatedExpiryDate || null,
            dietConflict: v.dietConflict || false,
            allergyConflict: v.allergyConflict || false,
            warning: v.warning || null,
            unit: 'pcs',
          };
        } catch {
          return { ...d, category: null, expiresAt: null, dietConflict: false, allergyConflict: false, warning: null, unit: 'pcs' };
        }
      })
    );
    const valid = enriched.filter(Boolean);
    setFilteredCount(rawItems.length - valid.length);
    return valid;
  };

  const revokePreview = () => {
    if (prevPreviewRef.current) {
      URL.revokeObjectURL(prevPreviewRef.current);
      prevPreviewRef.current = null;
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('scanning');
    setScanError(null);
    setDetections([]);
    setFilteredCount(0);
    setSaveError(null);

    revokePreview();
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    prevPreviewRef.current = preview;

    // Reset input so selecting the same file triggers onChange again
    e.target.value = '';

    try {
      const base64 = await fileToBase64(file);
      const result = await scanIngredientsFromImage(base64);
      const rawItems = (result.detections || []).map((d, i) => ({
        id: i + 1,
        name: d.name,
        confidence: d.confidence,
        qty: d.qty || 1,
      }));
      const items = await enrichDetections(rawItems);
      setDetections(items);
      setStatus('results');
    } catch (err) {
      setScanError(err.message);
      setStatus('idle');
    }
  };

  const handleSaveToPantry = () => {
    setShowSaveConfirm(true);
  };

  const confirmSaveToPantry = async () => {
    setShowSaveConfirm(false);
    setSaving(true);
    setSaveError(null);
    const failed = [];
    for (const d of detections) {
      try {
        await addPantryItem({
          name: d.name,
          quantity: Math.max(0.1, d.qty),
          unit: d.unit || 'pcs',
          category: d.category || null,
          expiresAt: d.expiresAt || null,
          source: 'scan',
        });
      } catch {
        failed.push(d.name);
      }
    }
    setSaving(false);
    if (failed.length > 0) {
      setSaveError(`Failed to save: ${failed.join(', ')}. The rest were saved.`);
    } else {
      revokePreview();
      setStatus('idle');
      setPreviewUrl(null);
      navigate('/pantry');
    }
  };

  const updateDetection = (id, field, value) => {
    if (field === 'qty') value = Math.max(0.1, Number(value) || 0.1);
    setDetections(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const removeDetection = (id) => {
    setDetections(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="hero-container">
      
      <div className="hero-banner">
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          backgroundImage: `url("${HERO_IMAGES.magicScan}")`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          zIndex: 1
        }} />
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'linear-gradient(to right, rgba(122, 94, 211, 0.8), rgba(var(--bg-rgb), 0.6))', // using our new brand gradients with transparency
          zIndex: 2
        }} />
        <div className="hero-content">
          <div className="hero-icon-box">
            <Camera size={40} color="white" />
          </div>
          <div>
            <h2 className="hero-title">Magic Scan</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'inherit' }}>
              <p className="hero-subtitle">Instantly organize your fridge or grocery haul using Groq Vision AI.</p>
              {activeDietNames.length > 0 && (
                <span style={{ background: '#84cc16', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  Diet: {activeDietNames.join(', ')}
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
      </div>

      <div style={{ width: '100%', margin: '0 auto', textAlign: 'center' }}>
      {scanError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginTop: '2rem', color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          <AlertTriangle size={16} /> {scanError}
        </div>
      )}

      {status === 'idle' && (
        <div className="glass-panel" style={{ padding: '4rem 2rem', marginTop: '3rem', borderStyle: 'dashed', borderWidth: '2px', cursor: 'pointer', transition: 'all var(--transition-fast)' }} onClick={() => fileInputRef.current?.click()} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--surface-border)'}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <div style={{ display: 'inline-flex', background: 'rgba(139, 92, 246, 0.1)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
            <Camera size={48} color="var(--primary-color)" />
          </div>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem' }}>Upload or Capture Ingredients</h3>
          <p style={{ color: 'var(--text-tertiary)', marginBottom: '2rem' }}>Take a photo of your fridge, pantry, or groceries.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="btn-primary">
              <FileImage size={18} /> Upload Image
            </button>
          </div>
        </div>
      )}

      {status === 'scanning' && (
        <div className="glass-panel" style={{ padding: '4rem 2rem', marginTop: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {previewUrl && (
            <img src={previewUrl} alt="Scanning..." style={{ width: '200px', height: '150px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', opacity: 0.7 }} />
          )}
          <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '2rem' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '4px solid rgba(139, 92, 246, 0.2)' }}></div>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '4px solid var(--primary-color)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            <Camera size={32} color="var(--primary-color)" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>Analyzing with Groq Vision AI...</h3>
          <p style={{ color: 'var(--text-tertiary)', margin: 0 }}>Detecting ingredients from your image.</p>
        </div>
      )}

      {status === 'results' && (
        <div className="glass-card" style={{ marginTop: '3rem', textAlign: 'left', animation: 'slideUpFade var(--transition-slow) ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
              <Check size={20} color="var(--success-color)" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Scan Successful</h3>
          </div>

          {previewUrl && (
            <img src={previewUrl} alt="Scanned" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }} />
          )}

          <div style={{ background: 'var(--surface-active)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '2rem' }}>
            {detections.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <AlertTriangle size={32} color="var(--text-tertiary)" style={{ marginBottom: '0.75rem' }} />
                <p style={{ margin: 0, fontSize: '0.95rem' }}>
                  {filteredCount > 0
                    ? `${filteredCount} detected item${filteredCount !== 1 ? 's were' : ' was'} filtered out as non-food. Try scanning a different image.`
                    : 'No food ingredients were detected. Try scanning a different image.'}
                </p>
              </div>
            ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {detections.map((d, index) => (
                <li key={d.id} style={{ padding: '1rem', borderBottom: index < detections.length - 1 ? '1px solid var(--surface-border)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: '600', fontSize: '1.05rem' }}>{d.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-success">
                        {(d.confidence * 100).toFixed(0)}% Match
                      </span>
                      <button onClick={() => removeDetection(d.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }} title="Remove">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <label style={{ color: 'var(--text-tertiary)' }}>Qty:</label>
                      <input type="number" min="0.1" step="0.1" value={d.qty} onChange={e => updateDetection(d.id, 'qty', Number(e.target.value))} className="input-field" style={{ width: '60px', padding: '0.3rem 0.4rem', fontSize: '0.85rem' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <label style={{ color: 'var(--text-tertiary)' }}>Unit:</label>
                      <select value={d.unit || 'pcs'} onChange={e => updateDetection(d.id, 'unit', e.target.value)} className="input-field" style={{ width: '70px', padding: '0.3rem 0.4rem', fontSize: '0.85rem' }}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    {d.category && (
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        Category: <strong style={{ color: 'var(--text-secondary)' }}>{d.category}</strong>
                      </span>
                    )}
                    {d.expiresAt && (
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        Expires: <strong style={{ color: 'var(--text-secondary)' }}>{d.expiresAt}</strong>
                      </span>
                    )}
                  </div>
                  {(d.dietConflict || d.allergyConflict) && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#d97706', fontSize: '0.85rem', background: 'rgba(245,158,11,0.1)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)' }}>
                      <AlertTriangle size={14} /> {d.warning || 'Conflicts with your diet or allergies'}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            )}
          </div>

          {saveError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} /> {saveError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => { setStatus('idle'); revokePreview(); setPreviewUrl(null); setScanError(null); setSaveError(null); setFilteredCount(0); }} className="btn-secondary" style={{ flex: 1 }}>
              Rescan
            </button>
            <button onClick={handleSaveToPantry} disabled={saving || detections.length === 0} className="btn-primary" style={{ flex: 2, opacity: (saving || detections.length === 0) ? 0.7 : 1, cursor: detections.length === 0 ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : <><Check size={18} /> Confirm & Save to Pantry</>}
            </button>
          </div>
        </div>
      )}
      </div>

      <ConfirmModal
        open={showSaveConfirm}
        title="Save to Pantry"
        message={`Add ${detections.length} scanned item${detections.length !== 1 ? 's' : ''} to your pantry?`}
        confirmText="Save All"
        variant="success"
        onConfirm={confirmSaveToPantry}
        onCancel={() => setShowSaveConfirm(false)}
      />
    </div>
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
