import React, { useState, useContext } from 'react';
import { Camera, Upload, Check, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../AppContext';

export default function MagicScanPage() {
  const navigate = useNavigate();
  const { pantryItems, setPantryItems } = useContext(AppContext);
  const [status, setStatus] = useState('idle'); // idle, scanning, results
  const [detections, setDetections] = useState([]);

  const handleScan = () => {
    setStatus('scanning');
    setTimeout(() => {
      setDetections([
        { id: 1, name: 'Tomatoes', confidence: 0.98, qty: 3, calories: 22 },
        { id: 2, name: 'Onion', confidence: 0.92, qty: 1, calories: 40 }
      ]);
      setStatus('results');
    }, 2000);
  };

  const handleSaveToPantry = () => {
    const newItems = detections.map((d, index) => ({
      id: Date.now() + index,
      name: d.name,
      quantity: d.qty,
      unit: 'pcs',
      expires: '2026-04-05',
      status: 'available',
      calories: d.calories
    }));
    setPantryItems([...pantryItems, ...newItems]);
    setStatus('idle');
    navigate('/pantry');
  };

  return (
    <div style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
      <h2 className="page-title">Magic Scan</h2>
      <p className="page-subtitle">Instantly organize your fridge or grocery haul using Groq Vision AI.</p>

      {status === 'idle' && (
        <div className="glass-panel" style={{ padding: '4rem 2rem', marginTop: '3rem', borderStyle: 'dashed', borderWidth: '2px', cursor: 'pointer', transition: 'all var(--transition-fast)' }} onClick={handleScan} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--surface-border)'}>
          <div style={{ display: 'inline-flex', background: 'rgba(139, 92, 246, 0.1)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
            <Camera size={48} color="var(--primary-color)" />
          </div>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem' }}>Upload or Capture Ingredients</h3>
          <p style={{ color: 'var(--text-tertiary)', marginBottom: '2rem' }}>Supports images of pantries, fridges, or receipts.</p>
          <button onClick={(e) => { e.stopPropagation(); handleScan(); }} className="btn-primary">
            <Upload size={18} /> Select Image
          </button>
        </div>
      )}

      {status === 'scanning' && (
        <div className="glass-panel" style={{ padding: '4rem 2rem', marginTop: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '2rem' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '4px solid rgba(139, 92, 246, 0.2)' }}></div>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '4px solid var(--primary-color)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            <Camera size={32} color="var(--primary-color)" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', animation: 'pulse 1.5s infinite' }} />
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>Analyzing Image...</h3>
          <p style={{ color: 'var(--text-tertiary)', margin: 0 }}>Detecting ingredients and predicting expiry dates.</p>
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
          
          <div style={{ background: 'var(--surface-active)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '2rem' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {detections.map((d, index) => (
                <li key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: index < detections.length - 1 ? '1px solid var(--surface-border)' : 'none' }}>
                  <span style={{ fontWeight: '500', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ display: 'inline-block', width: '24px', height: '24px', background: 'var(--surface-color)', borderRadius: '4px', textAlign: 'center', lineHeight: '24px', fontSize: '0.85rem' }}>{d.qty}x</span>
                    {d.name}
                  </span>
                  <span className="badge badge-success">
                    {(d.confidence * 100).toFixed(0)}% Match
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setStatus('idle')} className="btn-secondary" style={{ flex: 1 }}>
              Rescan
            </button>
            <button onClick={handleSaveToPantry} className="btn-primary" style={{ flex: 2 }}>
              <Check size={18} /> Confirm & Save to Pantry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
