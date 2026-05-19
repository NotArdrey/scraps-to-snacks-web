import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Clock, Leaf, Plus, RotateCcw, Settings, ShieldAlert, SlidersHorizontal, Target, Trash2, Users } from 'lucide-react';
import { AppContext } from '../AppContextValue';
import { usePreferences } from '../hooks/usePreferences';
import BrandIcon from '../components/BrandIcon';
import ThemeToggle from '../components/ThemeToggle';
import LoadingPanel from '../components/LoadingPanel';
import ConfirmModal from '../components/ConfirmModal';
import FeedbackModal from '../components/FeedbackModal';
import { CAROUSEL_IMAGES, CAROUSEL_INTERVAL_MS, HERO_IMAGES } from '../constants/images';
import { DEFAULT_RECIPE_PREFERENCES, normalizeRecipePreferences } from '../services/preferences';

const QUICK_CUSTOM_PREFERENCES = [
  'Low-carb',
  'Low-sodium',
  'Halal',
  'Kosher',
  'Low-FODMAP',
  'Diabetic-friendly',
  'High-protein',
  'No pork',
  'No beef',
];

const QUICK_EXCLUSIONS = ['Pork', 'Beef', 'Alcohol', 'Mushrooms', 'Onions', 'Garlic', 'Shellfish', 'Spicy food'];
const CUISINE_OPTIONS = ['Filipino', 'Japanese', 'Korean', 'Mediterranean', 'Indian', 'Mexican', 'Italian', 'Thai'];
const MEAL_TYPE_OPTIONS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Meal prep', 'Dessert'];

const TIME_OPTIONS = [
  { value: 'any', label: 'Any time' },
  { value: '15-min', label: '15 min' },
  { value: '30-min', label: '30 min' },
  { value: '45-min', label: '45 min' },
  { value: '60-min-plus', label: '60+ min' },
];

const BUDGET_OPTIONS = [
  { value: 'any', label: 'Any budget' },
  { value: 'budget', label: 'Budget' },
  { value: 'mid', label: 'Balanced' },
  { value: 'premium', label: 'Premium' },
];

const SKILL_OPTIONS = [
  { value: 'any', label: 'Any skill' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

function cleanEntry(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function addUnique(list, value) {
  const entry = cleanEntry(value);
  if (!entry) return list;
  if (list.some(item => item.toLowerCase() === entry.toLowerCase())) return list;
  return [...list, entry];
}

function removeAt(list, index) {
  return list.filter((_, itemIndex) => itemIndex !== index);
}

function buildFormState(selectedDiets, allergySeverityById, preferences) {
  const allergyEntries = Object.entries(allergySeverityById)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, severity]) => ({ id, severity }));

  return {
    diets: [...selectedDiets].sort(),
    allergies: allergyEntries,
    preferences: normalizeRecipePreferences(preferences),
  };
}

function stateToSnapshot(state) {
  return JSON.stringify(state);
}

function ChipButton({ selected, children, onClick, tone = 'green', describedBy }) {
  return (
    <button
      type="button"
      className={`preference-chip ${selected ? 'selected' : ''} tone-${tone}`}
      onClick={onClick}
      aria-pressed={selected}
      aria-describedby={describedBy}
    >
      <span className="preference-chip-check" aria-hidden="true">{selected && <Check size={15} />}</span>
      <span>{children}</span>
    </button>
  );
}

function TagList({ items, tone = 'green', onRemove, emptyText }) {
  if (!items.length) {
    return <p className="preference-empty">{emptyText}</p>;
  }

  return (
    <div className="preference-tag-list">
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className={`preference-tag tone-${tone}`}>
          {item}
          <button type="button" onClick={() => onRemove(index)} aria-label={`Remove ${item}`}>
            <Trash2 size={14} />
          </button>
        </span>
      ))}
    </div>
  );
}

function AddItemForm({ id, label, value, onChange, onAdd, placeholder }) {
  return (
    <form className="preference-add-form" onSubmit={onAdd}>
      <label htmlFor={id}>{label}</label>
      <div>
        <input id={id} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
        <button type="submit" className="btn-secondary">
          <Plus size={16} /> Add
        </button>
      </div>
    </form>
  );
}

function SectionHeader({ icon, label, title, description, tone = 'green' }) {
  return (
    <div className="preference-section-header">
      <span className={`preference-section-icon tone-${tone}`} aria-hidden="true">
        {React.createElement(icon, { size: 20 })}
      </span>
      <div>
        <span>{label}</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, isOnboarded, refreshProfile } = useContext(AppContext);
  const {
    dietTypes,
    allergyTypes,
    userDiets,
    userAllergies,
    recipePreferences,
    loading: prefsLoading,
    savePreferences,
  } = usePreferences(user);

  const [selectedDiets, setSelectedDiets] = useState(new Set());
  const [allergySeverityById, setAllergySeverityById] = useState({});
  const [draftPreferences, setDraftPreferences] = useState(DEFAULT_RECIPE_PREFERENCES);
  const [initialState, setInitialState] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [inputs, setInputs] = useState({
    customPreference: '',
    customAllergy: '',
    exclusion: '',
    cuisine: '',
    favorite: '',
    disliked: '',
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (prefsLoading || initialized) return undefined;

    const timeoutId = setTimeout(() => {
      const nextDiets = new Set(userDiets);
      const nextAllergySeverity = userAllergies.reduce((map, allergy) => ({
        ...map,
        [allergy.allergy_type_id]: allergy.severity || 'medium',
      }), {});
      const nextPreferences = normalizeRecipePreferences(recipePreferences);
      const nextState = buildFormState(nextDiets, nextAllergySeverity, nextPreferences);

      setSelectedDiets(nextDiets);
      setAllergySeverityById(nextAllergySeverity);
      setDraftPreferences(nextPreferences);
      setInitialState(nextState);
      setInitialized(true);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [prefsLoading, userDiets, userAllergies, recipePreferences, initialized]);

  const currentState = useMemo(
    () => buildFormState(selectedDiets, allergySeverityById, draftPreferences),
    [selectedDiets, allergySeverityById, draftPreferences]
  );
  const hasChanges = initialized && initialState && stateToSnapshot(currentState) !== stateToSnapshot(initialState);
  const canSave = !saving && (hasChanges || !isOnboarded);

  useEffect(() => {
    if (!hasChanges) return undefined;
    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasChanges]);

  const updateDraftPreferences = (updater) => {
    setDraftPreferences(prev => normalizeRecipePreferences(
      typeof updater === 'function' ? updater(prev) : updater
    ));
    setStatusMessage('');
  };

  const toggleDiet = (id) => {
    setSelectedDiets(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setStatusMessage('');
  };

  const toggleAllergy = (id) => {
    setAllergySeverityById(prev => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = 'medium';
      }
      return next;
    });
    updateDraftPreferences(prev => ({ ...prev, noAllergies: false }));
  };

  const setAllergySeverity = (id, severity) => {
    setAllergySeverityById(prev => ({ ...prev, [id]: severity }));
    updateDraftPreferences(prev => ({ ...prev, noAllergies: false }));
  };

  const setNoAllergies = (checked) => {
    if (checked) {
      setAllergySeverityById({});
      updateDraftPreferences(prev => ({
        ...prev,
        noAllergies: true,
        customAllergies: [],
        avoidCrossContamination: false,
      }));
    } else {
      updateDraftPreferences(prev => ({ ...prev, noAllergies: false }));
    }
  };

  const addInputItem = (event, inputKey, preferenceKey, mapItem = item => item) => {
    event.preventDefault();
    const value = cleanEntry(inputs[inputKey]);
    if (!value) return;
    updateDraftPreferences(prev => ({
      ...prev,
      [preferenceKey]: addUnique(prev[preferenceKey], mapItem(value)),
      noAllergies: preferenceKey === 'customAllergies' ? false : prev.noAllergies,
    }));
    setInputs(prev => ({ ...prev, [inputKey]: '' }));
  };

  const addQuickItem = (preferenceKey, value) => {
    updateDraftPreferences(prev => ({
      ...prev,
      [preferenceKey]: addUnique(prev[preferenceKey], value),
    }));
  };

  const addQuickCustomAllergy = (name) => {
    updateDraftPreferences(prev => ({
      ...prev,
      noAllergies: false,
      customAllergies: prev.customAllergies.some(item => item.name.toLowerCase() === name.toLowerCase())
        ? prev.customAllergies
        : [...prev.customAllergies, { name, severity: 'medium' }],
    }));
  };

  const setCustomAllergySeverity = (index, severity) => {
    updateDraftPreferences(prev => ({
      ...prev,
      customAllergies: prev.customAllergies.map((item, itemIndex) => (
        itemIndex === index ? { ...item, severity } : item
      )),
    }));
  };

  const removePreferenceItem = (preferenceKey, index) => {
    updateDraftPreferences(prev => ({
      ...prev,
      [preferenceKey]: removeAt(prev[preferenceKey], index),
    }));
  };

  const setSelectPreference = (key, value) => {
    updateDraftPreferences(prev => ({ ...prev, [key]: value }));
  };

  const clearAll = () => {
    setSelectedDiets(new Set());
    setAllergySeverityById({});
    setDraftPreferences(DEFAULT_RECIPE_PREFERENCES);
    setStatusMessage('All preference fields were cleared. Save to apply this reset.');
  };

  const restoreSaved = () => {
    if (!initialState) return;
    setSelectedDiets(new Set(initialState.diets));
    setAllergySeverityById(initialState.allergies.reduce((map, allergy) => ({
      ...map,
      [allergy.id]: allergy.severity,
    }), {}));
    setDraftPreferences(initialState.preferences);
    setStatusMessage('Unsaved changes were reset.');
  };

  const leavePreferences = () => {
    navigate(isOnboarded ? '/account' : '/subscription');
  };

  const requestCancel = () => {
    if (hasChanges) {
      setConfirmDiscard(true);
      return;
    }
    leavePreferences();
  };

  const handleComplete = async () => {
    if (saving || !canSave) return;
    setConfirmSave(false);
    setSaving(true);
    setStatusMessage(isOnboarded ? 'Saving preference changes...' : 'Saving preferences and opening your pantry...');
    try {
      const allergyPayload = Object.entries(allergySeverityById).map(([allergy_type_id, severity]) => ({
        allergy_type_id,
        severity,
      }));
      const nextPreferences = normalizeRecipePreferences(draftPreferences);
      await savePreferences([...selectedDiets], allergyPayload, {
        refresh: true,
        markOnboarded: !isOnboarded,
        recipePreferences: nextPreferences,
      });
      if (!isOnboarded) await refreshProfile();

      const nextState = buildFormState(selectedDiets, allergySeverityById, nextPreferences);
      setInitialState(nextState);
      setStatusMessage(isOnboarded ? 'Preferences saved.' : 'Onboarding complete.');
      setFeedback({
        title: isOnboarded ? 'Preferences saved' : 'Onboarding complete',
        message: isOnboarded
          ? 'Recipe generation, Magic Scan, and pantry validation will use these updated preferences.'
          : 'Your preferences were saved. Pantry recipes will now use your personalization settings.',
        variant: 'success',
        actionText: isOnboarded ? 'Back to Account' : 'Open Pantry',
        onClose: () => navigate(isOnboarded ? '/account' : '/pantry'),
      });
    } catch (err) {
      const message = err.message || 'Unable to save preferences. Please try again.';
      setStatusMessage(message);
      setFeedback({
        title: 'Save failed',
        message,
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const closeFeedback = () => {
    const afterClose = feedback?.onClose;
    setFeedback(null);
    afterClose?.();
  };

  const selectedAllergyIds = Object.keys(allergySeverityById);

  const editor = (
    <div className="preference-editor" aria-labelledby="preferences-title">
      <div className="preference-editor-heading">
        <div>
          <span className="preference-kicker">{isOnboarded ? 'Account preferences' : 'Personal setup'}</span>
          <h2 id="preferences-title">Diet, Allergies & Cooking Style</h2>
          <p>
            Diet choices are multi-select. Allergies and exclusions are treated as strict recipe and scan constraints.
          </p>
        </div>
        <span className={hasChanges ? 'preference-dirty-pill active' : 'preference-dirty-pill'}>
          {hasChanges ? 'Unsaved changes' : 'Saved'}
        </span>
      </div>

      <div className="preference-panel">
        <section className="preference-section" aria-labelledby="diet-section-title">
          <SectionHeader
            icon={Leaf}
            label="Diets"
            title="Recipe personalization"
            description="Choose any that apply. These are not radio buttons, so multiple diet styles can be active at once."
          />
          <div id="diet-multiselect-help" className="preference-help">
            {selectedDiets.size + draftPreferences.customDiets.length} selected
          </div>
          <div className="preference-chip-grid" role="group" aria-labelledby="diet-section-title" aria-describedby="diet-multiselect-help">
            {dietTypes.map(diet => (
              <ChipButton
                key={diet.id}
                selected={selectedDiets.has(diet.id)}
                onClick={() => toggleDiet(diet.id)}
                describedBy="diet-multiselect-help"
              >
                {diet.name}
              </ChipButton>
            ))}
          </div>

          <div className="preference-quick-row" aria-label="Suggested custom preferences">
            {QUICK_CUSTOM_PREFERENCES.map(item => (
              <button key={item} type="button" onClick={() => addQuickItem('customDiets', item)}>
                <Plus size={14} /> {item}
              </button>
            ))}
          </div>
          <AddItemForm
            id="custom-preference"
            label="Add custom preference"
            value={inputs.customPreference}
            onChange={value => setInputs(prev => ({ ...prev, customPreference: value }))}
            onAdd={event => addInputItem(event, 'customPreference', 'customDiets')}
            placeholder="e.g., anti-inflammatory"
          />
          <TagList
            items={draftPreferences.customDiets}
            onRemove={index => removePreferenceItem('customDiets', index)}
            emptyText="No custom diet preferences yet."
          />
        </section>

        <section className="preference-section" aria-labelledby="allergy-section-title">
          <SectionHeader
            icon={ShieldAlert}
            label="Allergies"
            title="Safety and exclusions"
            description="Selected allergies are excluded from generated recipes. Severity helps the app explain how strict the avoidance should be."
            tone="danger"
          />

          <label className="preference-toggle-row">
            <input
              type="checkbox"
              checked={draftPreferences.noAllergies}
              onChange={event => setNoAllergies(event.target.checked)}
            />
            <span>
              <strong>No allergies</strong>
              <small>Clears allergy selections, but you can still keep ingredient exclusions like pork or alcohol.</small>
            </span>
          </label>

          <label className="preference-toggle-row">
            <input
              type="checkbox"
              checked={draftPreferences.avoidCrossContamination}
              disabled={draftPreferences.noAllergies}
              onChange={event => updateDraftPreferences(prev => ({ ...prev, avoidCrossContamination: event.target.checked }))}
            />
            <span>
              <strong>Avoid cross-contamination</strong>
              <small>Flags recipes and scan validation to be stricter around selected allergies.</small>
            </span>
          </label>

          <div className="preference-chip-grid" role="group" aria-labelledby="allergy-section-title">
            {allergyTypes.map(allergy => (
              <ChipButton
                key={allergy.id}
                selected={Boolean(allergySeverityById[allergy.id])}
                onClick={() => toggleAllergy(allergy.id)}
                tone="danger"
              >
                {allergy.name}
              </ChipButton>
            ))}
          </div>

          {selectedAllergyIds.length > 0 && (
            <div className="preference-severity-grid" aria-label="Allergy severity levels">
              {selectedAllergyIds.map(id => {
                const allergy = allergyTypes.find(item => item.id === id);
                if (!allergy) return null;
                return (
                  <label key={id}>
                    <span>{allergy.name} severity</span>
                    <select value={allergySeverityById[id]} onChange={event => setAllergySeverity(id, event.target.value)}>
                      <option value="mild">Mild</option>
                      <option value="medium">Medium</option>
                      <option value="severe">Severe</option>
                    </select>
                  </label>
                );
              })}
            </div>
          )}

          <div className="preference-quick-row" aria-label="Suggested ingredient exclusions">
            {QUICK_EXCLUSIONS.map(item => (
              <button key={item} type="button" onClick={() => addQuickItem('exclusions', item)}>
                <Plus size={14} /> No {item}
              </button>
            ))}
          </div>

          <AddItemForm
            id="custom-allergy"
            label="Add custom allergy"
            value={inputs.customAllergy}
            onChange={value => setInputs(prev => ({ ...prev, customAllergy: value }))}
            onAdd={(event) => {
              event.preventDefault();
              const value = cleanEntry(inputs.customAllergy);
              if (!value) return;
              addQuickCustomAllergy(value);
              setInputs(prev => ({ ...prev, customAllergy: '' }));
            }}
            placeholder="e.g., sesame"
          />
          {draftPreferences.customAllergies.length > 0 ? (
            <div className="preference-custom-allergies" aria-label="Custom allergy severity levels">
              {draftPreferences.customAllergies.map((item, index) => (
                <div key={`${item.name}-${index}`} className="preference-custom-allergy">
                  <strong>{item.name}</strong>
                  <label>
                    <span>Severity</span>
                    <select value={item.severity} onChange={event => setCustomAllergySeverity(index, event.target.value)}>
                      <option value="mild">Mild</option>
                      <option value="medium">Medium</option>
                      <option value="severe">Severe</option>
                    </select>
                  </label>
                  <button type="button" onClick={() => removePreferenceItem('customAllergies', index)} aria-label={`Remove ${item.name}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="preference-empty">No custom allergies yet.</p>
          )}

          <AddItemForm
            id="custom-exclusion"
            label="Add ingredient exclusion"
            value={inputs.exclusion}
            onChange={value => setInputs(prev => ({ ...prev, exclusion: value }))}
            onAdd={event => addInputItem(event, 'exclusion', 'exclusions')}
            placeholder="e.g., cilantro"
          />
          <TagList
            items={draftPreferences.exclusions.map(item => `No ${item}`)}
            tone="danger"
            onRemove={index => removePreferenceItem('exclusions', index)}
            emptyText="No ingredient exclusions yet."
          />
        </section>

        <section className="preference-section" aria-labelledby="style-section-title">
          <SectionHeader
            icon={SlidersHorizontal}
            label="Cooking style"
            title="Depth controls"
            description="These settings shape generated recipes when pantry ingredients allow it."
          />

          <div className="preference-choice-group">
            <div>
              <h4 id="cuisine-title">Cuisine preferences</h4>
              <div className="preference-quick-row" aria-labelledby="cuisine-title">
                {CUISINE_OPTIONS.map(cuisine => (
                  <button key={cuisine} type="button" onClick={() => addQuickItem('cuisines', cuisine)}>
                    <Plus size={14} /> {cuisine}
                  </button>
                ))}
              </div>
              <AddItemForm
                id="custom-cuisine"
                label="Add cuisine"
                value={inputs.cuisine}
                onChange={value => setInputs(prev => ({ ...prev, cuisine: value }))}
                onAdd={event => addInputItem(event, 'cuisine', 'cuisines')}
                placeholder="e.g., Levantine"
              />
              <TagList
                items={draftPreferences.cuisines}
                onRemove={index => removePreferenceItem('cuisines', index)}
                emptyText="No cuisine preferences yet."
              />
            </div>

            <div>
              <h4 id="meal-title">Meal types</h4>
              <div className="preference-chip-grid compact" role="group" aria-labelledby="meal-title">
                {MEAL_TYPE_OPTIONS.map(mealType => (
                  <ChipButton
                    key={mealType}
                    selected={draftPreferences.mealTypes.includes(mealType)}
                    onClick={() => updateDraftPreferences(prev => ({
                      ...prev,
                      mealTypes: prev.mealTypes.includes(mealType)
                        ? prev.mealTypes.filter(item => item !== mealType)
                        : [...prev.mealTypes, mealType],
                    }))}
                  >
                    {mealType}
                  </ChipButton>
                ))}
              </div>
            </div>
          </div>

          <div className="preference-field-grid">
            <label>
              <Clock size={17} />
              <span>Cooking time</span>
              <select value={draftPreferences.cookingTime} onChange={event => setSelectPreference('cookingTime', event.target.value)}>
                {TIME_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <Target size={17} />
              <span>Budget</span>
              <select value={draftPreferences.budget} onChange={event => setSelectPreference('budget', event.target.value)}>
                {BUDGET_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <Settings size={17} />
              <span>Skill level</span>
              <select value={draftPreferences.skillLevel} onChange={event => setSelectPreference('skillLevel', event.target.value)}>
                {SKILL_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <Users size={17} />
              <span>Servings</span>
              <input
                type="number"
                min="1"
                max="20"
                value={draftPreferences.servings}
                onChange={event => updateDraftPreferences(prev => ({ ...prev, servings: event.target.value }))}
              />
            </label>
          </div>
        </section>

        <section className="preference-section" aria-labelledby="ingredients-section-title">
          <SectionHeader
            icon={Target}
            label="Ingredients and targets"
            title="Priorities"
            description="Tell the recipe engine what to favor, what to avoid, and any macro targets you care about."
          />

          <div className="preference-choice-group">
            <div>
              <AddItemForm
                id="favorite-ingredient"
                label="Favorite ingredient"
                value={inputs.favorite}
                onChange={value => setInputs(prev => ({ ...prev, favorite: value }))}
                onAdd={event => addInputItem(event, 'favorite', 'favoriteIngredients')}
                placeholder="e.g., tofu"
              />
              <TagList
                items={draftPreferences.favoriteIngredients}
                onRemove={index => removePreferenceItem('favoriteIngredients', index)}
                emptyText="No favorite ingredients yet."
              />
            </div>
            <div>
              <AddItemForm
                id="disliked-ingredient"
                label="Disliked ingredient"
                value={inputs.disliked}
                onChange={value => setInputs(prev => ({ ...prev, disliked: value }))}
                onAdd={event => addInputItem(event, 'disliked', 'dislikedIngredients')}
                placeholder="e.g., bitter melon"
              />
              <TagList
                items={draftPreferences.dislikedIngredients}
                tone="danger"
                onRemove={index => removePreferenceItem('dislikedIngredients', index)}
                emptyText="No disliked ingredients yet."
              />
            </div>
          </div>

          <div className="preference-field-grid macro">
            <label>
              <span>Calories</span>
              <input value={draftPreferences.calorieTarget} onChange={event => updateDraftPreferences(prev => ({ ...prev, calorieTarget: event.target.value }))} placeholder="e.g., 500 per meal" />
            </label>
            <label>
              <span>Protein</span>
              <input value={draftPreferences.proteinTarget} onChange={event => updateDraftPreferences(prev => ({ ...prev, proteinTarget: event.target.value }))} placeholder="e.g., 30g+" />
            </label>
            <label>
              <span>Carbs</span>
              <input value={draftPreferences.carbTarget} onChange={event => updateDraftPreferences(prev => ({ ...prev, carbTarget: event.target.value }))} placeholder="e.g., under 45g" />
            </label>
          </div>

          <label className="preference-notes">
            <span>Extra notes</span>
            <textarea
              value={draftPreferences.notes}
              onChange={event => updateDraftPreferences(prev => ({ ...prev, notes: event.target.value }))}
              placeholder="Anything else the recipe engine should consider?"
              rows={4}
            />
          </label>
        </section>

        <div className="preference-footer">
          <div aria-live="polite" className="preference-save-status">
            {statusMessage || (hasChanges ? 'Review and save your changes.' : 'No unsaved changes.')}
          </div>
          <div className="preference-footer-actions">
            <button type="button" className="btn-secondary" onClick={restoreSaved} disabled={!hasChanges || saving}>
              <RotateCcw size={16} /> Reset changes
            </button>
            <button type="button" className="btn-secondary" onClick={clearAll} disabled={saving}>
              Clear all
            </button>
            <button type="button" className="btn-secondary" onClick={requestCancel} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={() => setConfirmSave(true)} disabled={!canSave}>
              {saving ? 'Saving...' : isOnboarded ? 'Save Preferences' : 'Complete Onboarding'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const actionModals = (
    <>
      <ConfirmModal
        open={confirmSave}
        title={isOnboarded ? 'Save Preferences' : 'Complete Onboarding'}
        message={
          isOnboarded
            ? 'Save these personalization settings for Pantry, Magic Scan, and generated recipes?'
            : 'Save these personalization settings and continue to your pantry?'
        }
        confirmText={isOnboarded ? 'Save' : 'Complete'}
        variant="success"
        onConfirm={handleComplete}
        onCancel={() => setConfirmSave(false)}
      />
      <ConfirmModal
        open={confirmDiscard}
        title="Discard unsaved changes?"
        message="You have unsaved preference changes. Leave this page without saving them?"
        confirmText="Discard"
        variant="danger"
        onConfirm={() => {
          setConfirmDiscard(false);
          leavePreferences();
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
      <FeedbackModal
        open={!!feedback}
        title={feedback?.title}
        message={feedback?.message}
        variant={feedback?.variant}
        actionText={feedback?.actionText}
        onClose={closeFeedback}
      />
    </>
  );

  if (prefsLoading || !initialized) {
    return <LoadingPanel title="Loading preferences" message="Fetching your diet, allergy, and cooking options." />;
  }

  if (isOnboarded) {
    return (
      <>
        <div className="preference-page">
          <button type="button" className="preference-back-button" onClick={requestCancel}>
            <ArrowLeft size={18} /> Back to Account
          </button>
          <div className="account-hero preference-hero">
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("${HERO_IMAGES.account}")`, backgroundPosition: 'center', backgroundSize: 'cover', zIndex: 1 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.82), rgba(0,0,0,0.28))', zIndex: 2 }} />
            <div className="account-hero-content">
              <div>
                <Settings size={36} color="white" />
              </div>
              <div>
                <h2>Preferences</h2>
                <p>Manage diet choices, allergy strictness, and recipe style.</p>
              </div>
            </div>
          </div>
          {editor}
        </div>
        {actionModals}
      </>
    );
  }

  return (
    <>
      <div className="split-auth-page split-auth-onboarding">
        <ThemeToggle className="split-auth-theme-toggle" />
        <div className="split-auth-form-panel preference-onboarding-panel">
          <div className="split-auth-form-card preference-onboarding-card">
            <div className="split-auth-mobile-brand" aria-label="Scraps2Snacks">
              <BrandIcon size={30} />
              <span>Scraps<span>2</span>Snacks</span>
            </div>
            {editor}
          </div>
        </div>

        <div
          className="split-auth-media-panel"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(var(--bg-rgb), 0.25), rgba(var(--bg-rgb), 0.86)), url("${CAROUSEL_IMAGES[currentImageIndex]}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="split-auth-media-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: '800' }}>
                Scraps<span style={{ color: '#e4572e' }}>2</span>Snacks
              </span>
              <BrandIcon size={32} />
            </div>
          </div>
          <div className="split-auth-media-copy">
            <h1 className="split-auth-media-heading">Recipes that respect your kitchen</h1>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '2rem' }}>
              {CAROUSEL_IMAGES.map((_, idx) => (
                <span
                  key={idx}
                  style={{
                    height: '4px',
                    width: '24px',
                    backgroundColor: currentImageIndex === idx ? '#ffffff' : 'rgba(255,255,255,0.34)',
                    borderRadius: '2px',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      {actionModals}
    </>
  );
}
