import React, { useState, useContext, useRef } from 'react';
import { Camera, Check, AlertTriangle, FileImage, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../AppContext';
import { usePantry } from '../hooks/usePantry';
import { usePreferences } from '../hooks/usePreferences';
import { scanIngredientsFromImage, validateIngredient } from '../services/groq';
import ConfirmModal from '../components/ConfirmModal';

const UNITS = ['pcs', 'kg', 'g', 'lbs', 'oz', 'L', 'mL', 'cups', 'tbsp', 'tsp'];

export default function MagicScan() {
  const navigate = useNavigate();
  const { user, householdId } = useContext(AppContext);
  const { addPantryItem } = usePantry(user, householdId);
  const { activeDietName, allergyTypes, userAllergies } = usePreferences(user);
  const fileInputRef = useRef(null);

  const activeAllergyNames = allergyTypes
    .filter(a => userAllergies.some(ua => ua.allergy_type_id === a.id))
    .map(a => a.name);

  const [status, setStatus] = useState('idle');
  const [detections, setDetections] = useState([]);
  const [saving, setSaving] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const enrichDetections = async (rawItems) => {
    const enriched = await Promise.all(
      rawItems.map(async (d) => {
        try {
          const v = await validateIngredient(d.name, activeDietName, activeAllergyNames);
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
    return enriched.filter(Boolean);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('scanning');
    setScanError(null);

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

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
    for (const d of detections) {
      await addPantryItem({
        name: d.name,
        quantity: d.qty,
        unit: d.unit || 'pcs',
        category: d.category || null,
        expiresAt: d.expiresAt || null,
        source: 'scan',
      });
    }
    setSaving(false);
    setStatus('idle');
    setPreviewUrl(null);
    navigate('/pantry');
  };

  const updateDetection = (id, field, value) => {
    setDetections(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const removeDetection = (id) => {
    setDetections(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
      
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
          backgroundImage: 'url("https://images.unsplash.com/photo-1654683413645-d8d15189384c?q=80&w=2076&auto=format&fit=crop")',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          zIndex: 1
        }} />
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'linear-gradient(to right, rgba(249,115,22,0.8), rgba(244,63,94,0.3))', // using our new brand gradients with transparency
          zIndex: 2
        }} />
        <div style={{ position: 'relative', zIndex: 3, padding: '4rem 3rem', color: 'white', textAlign: 'center' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: 'white' }}>Magic Scan</h2>
          <p style={{ fontSize: '1.2rem', color: '#fff1f2', margin: 0 }}>Instantly organize your fridge or grocery haul using Groq Vision AI.</p>
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
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
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => { setStatus('idle'); setPreviewUrl(null); setScanError(null); }} className="btn-secondary" style={{ flex: 1 }}>
              Rescan
            </button>
            <button onClick={handleSaveToPantry} disabled={saving} className="btn-primary" style={{ flex: 2, opacity: saving ? 0.7 : 1 }}>
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
