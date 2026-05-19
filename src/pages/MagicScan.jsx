import React, { useState, useContext, useRef } from 'react';
import { Camera, Check, AlertTriangle, Trash2, ShieldAlert, Upload, PackageCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../AppContextValue';
import { usePantry } from '../hooks/usePantry';
import { usePreferences } from '../hooks/usePreferences';
import { scanIngredientsFromImage, validateIngredient } from '../services/ai';
import ConfirmModal from '../components/ConfirmModal';
import FeedbackModal from '../components/FeedbackModal';
import { UNITS } from '../constants/categories';

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getFreshnessLabel(freshness) {
  if (freshness === 'fresh') return 'Fresh';
  if (freshness === 'good') return 'Good';
  if (freshness === 'aging') return 'Aging';
  if (freshness === 'questionable') return 'Questionable';
  if (freshness === 'spoiled') return 'Spoiled';
  return 'Unknown';
}

function getFreshnessTone(freshness) {
  if (freshness === 'fresh' || freshness === 'good') return 'success';
  if (freshness === 'aging') return 'warning';
  if (freshness === 'questionable' || freshness === 'spoiled') return 'danger';
  return 'neutral';
}

export default function MagicScan() {
  const navigate = useNavigate();
  const { user, householdId } = useContext(AppContext);
  const { addPantryItem } = usePantry(user, householdId);
  const { activeAllergyNames, allergyDisplayNames, preferenceTags, recipePreferenceText } = usePreferences(user);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const prevPreviewRef = useRef(null);

  const [status, setStatus] = useState('idle');
  const [detections, setDetections] = useState([]);
  const [saving, setSaving] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [filteredCount, setFilteredCount] = useState(0);
  const [feedback, setFeedback] = useState(null);

  if (!user || !householdId) {
    return (
      <div className="magic-scan-page">
        <div className="scan-empty-panel">
          <AlertTriangle size={42} />
          <h2>Sign in required</h2>
          <p>You need to be signed in with a household to use Magic Scan.</p>
          <button onClick={() => navigate('/login')} className="btn-primary">Sign in</button>
        </div>
      </div>
    );
  }

  const enrichDetections = async (rawItems) => {
    const enriched = await Promise.all(
      rawItems.map(async (d) => {
        try {
          const freshnessData = {
            freshness: d.freshness,
            freshnessScore: d.freshnessScore,
            condition: d.condition,
          };
          const v = await validateIngredient(d.name, recipePreferenceText, activeAllergyNames, freshnessData);
          if (!v.isFood) return null;
          return {
            ...d,
            name: v.correctedName || d.name,
            category: v.category || null,
            expiresAt: v.estimatedExpiryDate || null,
            dietConflict: v.dietConflict || false,
            allergyConflict: v.allergyConflict || false,
            warning: v.warning || null,
            freshnessWarning: v.freshnessWarning || null,
            unit: 'pcs',
          };
        } catch {
          return { ...d, category: null, expiresAt: null, dietConflict: false, allergyConflict: false, warning: null, freshnessWarning: null, unit: 'pcs' };
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

    if (!file.type.startsWith('image/')) {
      setScanError('Please upload an image file.');
      e.target.value = '';
      return;
    }

    setStatus('scanning');
    setScanError(null);
    setDetections([]);
    setFilteredCount(0);
    setSaveError(null);

    revokePreview();
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    prevPreviewRef.current = preview;

    e.target.value = '';

    try {
      const base64 = await fileToBase64(file);
      const result = await scanIngredientsFromImage(base64);
      const rawItems = (result.detections || []).map((d, i) => ({
        id: i + 1,
        name: d.name,
        confidence: d.confidence,
        qty: d.qty || 1,
        freshness: d.freshness || 'good',
        freshnessScore: d.freshnessScore ?? 0.8,
        condition: d.condition || null,
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
      const message = `Failed to save: ${failed.join(', ')}. The rest were saved.`;
      setSaveError(message);
      setFeedback({
        title: 'Some items were not saved',
        message,
        variant: 'warning',
      });
    } else {
      revokePreview();
      setStatus('idle');
      setPreviewUrl(null);
      setFeedback({
        title: 'Items saved',
        message: `${detections.length} scanned item${detections.length !== 1 ? 's were' : ' was'} added to your pantry.`,
        variant: 'success',
        actionText: 'Open Pantry',
        onClose: () => navigate('/pantry'),
      });
    }
  };

  const closeFeedback = () => {
    const afterClose = feedback?.onClose;
    setFeedback(null);
    afterClose?.();
  };

  const updateDetection = (id, field, value) => {
    if (field === 'qty') value = Math.max(0.1, Number(value) || 0.1);
    setDetections(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const removeDetection = (id) => {
    setDetections(prev => prev.filter(d => d.id !== id));
  };

  const handleResetScan = () => {
    setStatus('idle');
    revokePreview();
    setPreviewUrl(null);
    setScanError(null);
    setSaveError(null);
    setFilteredCount(0);
    setDetections([]);
  };

  const reviewCount = detections.filter(d => (
    d.dietConflict ||
    d.allergyConflict ||
    d.freshness === 'spoiled' ||
    d.freshness === 'questionable' ||
    d.freshness === 'aging'
  )).length;
  const safeCount = Math.max(0, detections.length - reviewCount);
  const scanStateLabel = status === 'scanning' ? 'Scanning' : status === 'results' ? 'Review' : 'Ready';

  return (
    <div className="magic-scan-page">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <section className="scan-command-header" aria-labelledby="scan-title">
        <div className="scan-command-icon" aria-hidden="true">
          <Camera size={28} />
        </div>
        <div className="scan-command-copy">
          <span className="scan-kicker">AI intake station</span>
          <h1 id="scan-title">Magic Scan</h1>
          <p>Review detected ingredients, freshness, and allergy conflicts before they enter the pantry.</p>
          <div className="scan-chip-row" aria-label="Active recipe constraints">
            {preferenceTags.length > 0 && (
              <span>Preferences: {preferenceTags.slice(0, 4).join(', ')}</span>
            )}
            {allergyDisplayNames.length > 0 && (
              <span className="danger">Avoid: {allergyDisplayNames.slice(0, 4).join(', ')}</span>
            )}
            {preferenceTags.length === 0 && allergyDisplayNames.length === 0 && (
              <span>No recipe constraints set</span>
            )}
          </div>
        </div>
      </section>

      {scanError && (
        <div className="scan-alert danger" role="alert">
          <AlertTriangle size={18} /> {scanError}
        </div>
      )}

      <section className="scan-stat-grid" aria-label="Scan overview">
        <div className="scan-stat-card">
          <span>Scan state</span>
          <strong>{scanStateLabel}</strong>
          <small>{status === 'results' ? `${pluralize(detections.length, 'item')} ready for review` : 'Waiting for image input'}</small>
        </div>
        <div className="scan-stat-card">
          <span>Detected food</span>
          <strong>{detections.length}</strong>
          <small>{filteredCount > 0 ? `${pluralize(filteredCount, 'non-food item')} filtered` : 'Only food items are saved'}</small>
        </div>
        <div className={`scan-stat-card ${reviewCount > 0 ? 'warning' : ''}`}>
          <span>Needs review</span>
          <strong>{reviewCount}</strong>
          <small>Diet, allergy, or freshness flags</small>
        </div>
        <div className="scan-stat-card">
          <span>Pantry-ready</span>
          <strong>{safeCount}</strong>
          <small>{status === 'results' ? 'No blocking warnings shown' : 'Appears after scanning'}</small>
        </div>
      </section>

      <div className="scan-workspace">
        <section className="scan-capture-panel" aria-labelledby="scan-capture-title">
          <div className="scan-panel-heading">
            <span>Image source</span>
            <h2 id="scan-capture-title">{previewUrl ? 'Current scan' : 'Start a scan'}</h2>
            <p>{previewUrl ? 'Preview stays here while detections are reviewed.' : 'Use a fridge, pantry, grocery, or leftover photo.'}</p>
          </div>

          <button type="button" className="scan-capture-dropzone" onClick={() => fileInputRef.current?.click()}>
            {previewUrl ? (
              <img src={previewUrl} alt="Selected ingredients" />
            ) : (
              <span>
                <Camera size={44} />
                <strong>Upload or capture ingredients</strong>
                <small>JPG, PNG, or camera photo</small>
              </span>
            )}
            {status === 'scanning' && (
              <div className="scan-processing-overlay">
                <Sparkles size={24} />
                <strong>Analyzing image</strong>
              </div>
            )}
          </button>

          <div className="scan-capture-actions">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-primary">
              <Upload size={17} /> Upload image
            </button>
            <button type="button" onClick={() => cameraInputRef.current?.click()} className="btn-secondary">
              <Camera size={17} /> Take photo
            </button>
          </div>
        </section>

        <aside className="scan-rule-panel" aria-label="Scan handling rules">
          <div>
            <span className="scan-kicker">Safety rules</span>
            <h2>Pantry intake checks</h2>
            <p>Detected items are validated as food, checked against preferences, and tagged with likely freshness.</p>
          </div>
          <div className="scan-rule-list">
            <div>
              <PackageCheck size={18} />
              <span>Auto category and expiry estimates</span>
            </div>
            <div>
              <ShieldAlert size={18} />
              <span>Allergy and diet warnings stay visible</span>
            </div>
            <div>
              <Check size={18} />
              <span>Quantity and units remain editable</span>
            </div>
          </div>
        </aside>

        <section className="scan-results-panel" aria-labelledby="scan-results-title">
          <div className="scan-results-heading">
            <div>
              <span className="scan-kicker">Detection review</span>
              <h2 id="scan-results-title">{status === 'results' ? `${detections.length} detected item${detections.length === 1 ? '' : 's'}` : 'No detections yet'}</h2>
              <p>{status === 'results' ? `${safeCount} pantry-ready, ${reviewCount} needing attention.` : 'Scan results appear here after analysis.'}</p>
            </div>
            {status === 'results' && (
              <button type="button" onClick={handleResetScan} className="btn-secondary">
                <Camera size={17} /> Rescan
              </button>
            )}
          </div>

          {status === 'idle' && (
            <div className="scan-empty-panel compact">
              <Camera size={34} />
              <h3>Ready for an image</h3>
              <p>Detections, freshness flags, and pantry fields will land in this review queue.</p>
            </div>
          )}

          {status === 'scanning' && (
            <div className="scan-empty-panel compact">
              <Sparkles size={34} className="scan-spin" />
              <h3>Scanning ingredients</h3>
              <p>AI is reading the image and checking pantry safety rules.</p>
            </div>
          )}

          {status === 'results' && detections.length === 0 && (
            <div className="scan-empty-panel compact">
              <AlertTriangle size={34} />
              <h3>No food detected</h3>
              <p>
                {filteredCount > 0
                  ? `${filteredCount} detected item${filteredCount !== 1 ? 's were' : ' was'} filtered out as non-food.`
                  : 'Try a clearer image with visible ingredients.'}
              </p>
            </div>
          )}

          {status === 'results' && detections.length > 0 && (
            <>
              <ul className="scan-detection-list">
                {detections.map((d) => {
                  const preferenceWarning = d.dietConflict || d.allergyConflict;
                  const freshnessTone = getFreshnessTone(d.freshness);
                  return (
                    <li key={d.id} className={`scan-detection-card ${preferenceWarning || freshnessTone === 'danger' ? 'needs-review' : ''}`}>
                      <div className="scan-detection-top">
                        <div>
                          <span>Detected item</span>
                          <strong>{d.name}</strong>
                        </div>
                        <div className="scan-detection-actions">
                          <span className="scan-pill success">{(d.confidence * 100).toFixed(0)}% match</span>
                          <span className={`scan-pill ${freshnessTone}`}>{getFreshnessLabel(d.freshness)}</span>
                          <button type="button" onClick={() => removeDetection(d.id)} className="scan-icon-button danger" title="Remove" aria-label={`Remove ${d.name}`}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="scan-detection-fields">
                        <label>
                          <span>Qty</span>
                          <input type="number" min="0.1" step="0.1" value={d.qty} onChange={e => updateDetection(d.id, 'qty', Number(e.target.value))} />
                        </label>
                        <label>
                          <span>Unit</span>
                          <select value={d.unit || 'pcs'} onChange={e => updateDetection(d.id, 'unit', e.target.value)}>
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </label>
                        <label>
                          <span>Category</span>
                          <output>{d.category || 'Uncategorized'}</output>
                        </label>
                        <label>
                          <span>Expires</span>
                          <output>{d.expiresAt || 'No estimate'}</output>
                        </label>
                      </div>

                      {preferenceWarning && (
                        <div className="scan-inline-alert warning">
                          <AlertTriangle size={15} /> {d.warning || 'Conflicts with your diet or allergies'}
                        </div>
                      )}
                      {(d.freshness === 'spoiled' || d.freshness === 'questionable') && (
                        <div className="scan-inline-alert danger">
                          <ShieldAlert size={15} />
                          {d.freshness === 'spoiled' ? 'This item appears spoiled and should not be consumed.' : 'This item looks questionable - use within 1-2 days or discard.'}
                          {d.condition && <span>({d.condition})</span>}
                        </div>
                      )}
                      {d.freshness === 'aging' && (
                        <div className="scan-inline-alert warning">
                          <AlertTriangle size={15} /> This item is aging - use it soon.
                          {d.condition && <span>({d.condition})</span>}
                        </div>
                      )}
                      {d.freshnessWarning && d.freshness !== 'spoiled' && d.freshness !== 'questionable' && d.freshness !== 'aging' && (
                        <div className="scan-inline-alert neutral">
                          <AlertTriangle size={15} /> {d.freshnessWarning}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {saveError && (
                <div className="scan-alert danger" role="alert">
                  <AlertTriangle size={18} /> {saveError}
                </div>
              )}

              <div className="scan-results-actions">
                <button type="button" onClick={handleResetScan} className="btn-secondary">
                  Rescan
                </button>
                <button type="button" onClick={handleSaveToPantry} disabled={saving || detections.length === 0} className="btn-primary">
                  {saving ? 'Saving...' : <><Check size={18} /> Save to pantry</>}
                </button>
              </div>
            </>
          )}
        </section>
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

      <FeedbackModal
        open={!!feedback}
        title={feedback?.title}
        message={feedback?.message}
        variant={feedback?.variant}
        actionText={feedback?.actionText}
        onClose={closeFeedback}
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
