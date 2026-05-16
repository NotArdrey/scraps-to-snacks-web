const QUANTITY_UNITS = [
  'pcs', 'piece', 'pieces', 'kg', 'g', 'gram', 'grams', 'lbs', 'lb', 'oz',
  'L', 'l', 'mL', 'ml', 'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons',
  'tsp', 'teaspoon', 'teaspoons',
];

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function roundMoney(value) {
  return Math.round(Math.max(0, toNumber(value)) * 100) / 100;
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function parseFraction(value) {
  if (!value) return null;
  if (String(value).includes('/')) {
    const [top, bottom] = String(value).split('/').map(Number);
    return Number.isFinite(top) && Number.isFinite(bottom) && bottom !== 0 ? top / bottom : null;
  }
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parseIngredientLine(line) {
  const text = typeof line === 'string' ? line.trim().replace(/\s+/g, ' ') : '';
  if (!text) return null;

  const match = text.match(/^(\d+(?:\.\d+)?|\d+\/\d+)(?:\s+([a-zA-Z]+))?\s+(.+)$/);
  if (!match) return { name: text, quantity: 1, unit: '' };

  const quantity = parseFraction(match[1]) || 1;
  const maybeUnit = match[2] || '';
  const hasKnownUnit = QUANTITY_UNITS.some(unit => unit.toLowerCase() === maybeUnit.toLowerCase());

  return {
    name: hasKnownUnit ? match[3] : `${maybeUnit} ${match[3]}`.trim(),
    quantity,
    unit: hasKnownUnit ? maybeUnit : '',
  };
}

function normalizeIngredientDetails(recipeData) {
  if (Array.isArray(recipeData?.ingredientDetails) && recipeData.ingredientDetails.length > 0) {
    return recipeData.ingredientDetails
      .map(detail => ({
        name: String(detail?.name || '').trim(),
        quantity: toNumber(detail?.quantity, 1) || 1,
        unit: String(detail?.unit || '').trim(),
        pantryIngredient: detail?.pantryIngredient !== false,
      }))
      .filter(detail => detail.name);
  }

  if (Array.isArray(recipeData?.ingredients) && recipeData.ingredients.length > 0) {
    return recipeData.ingredients
      .map(parseIngredientLine)
      .filter(Boolean)
      .map(detail => ({ ...detail, pantryIngredient: true }));
  }

  return [];
}

function fallbackUnitPrice(name, unit) {
  const lowerName = String(name || '').toLowerCase();
  const lowerUnit = String(unit || '').toLowerCase();

  if (lowerName.includes('egg')) return lowerUnit === 'pcs' ? 10 : 10;
  if (lowerName.includes('chicken')) return ['g', 'gram', 'grams'].includes(lowerUnit) ? 0.34 : 85;
  if (lowerName.includes('beef') || lowerName.includes('pork')) return ['g', 'gram', 'grams'].includes(lowerUnit) ? 0.42 : 95;
  if (lowerName.includes('fish') || lowerName.includes('tilapia') || lowerName.includes('bangus')) return ['g', 'gram', 'grams'].includes(lowerUnit) ? 0.28 : 75;
  if (lowerName.includes('rice')) return lowerUnit.includes('cup') ? 15 : 55;
  if (lowerName.includes('tomato')) return lowerUnit === 'pcs' ? 8 : 80;
  if (lowerName.includes('onion')) return lowerUnit === 'pcs' ? 10 : 110;
  if (lowerName.includes('garlic')) return lowerUnit === 'pcs' ? 6 : 140;
  if (lowerName.includes('spinach') || lowerName.includes('leaf') || lowerName.includes('vegetable')) return ['g', 'gram', 'grams'].includes(lowerUnit) ? 0.15 : 25;
  if (lowerName.includes('oil')) return lowerUnit.includes('tbsp') ? 6 : 160;
  if (lowerName.includes('salt') || lowerName.includes('pepper') || lowerName.includes('spice')) return 2;
  return lowerUnit === 'pcs' ? 15 : 20;
}

function hasUsableCostEstimate(costEstimate) {
  return Boolean(costEstimate && Number(costEstimate.totalCost) > 0 && Array.isArray(costEstimate.items));
}

export function ensureRecipeCostEstimate(recipeData, pantryItems = []) {
  if (hasUsableCostEstimate(recipeData?.costEstimate)) return recipeData;

  const details = normalizeIngredientDetails(recipeData);
  const pantryList = pantryItems || [];
  const pantryNames = new Set(pantryList.map(item => normalizeName(item?.name)));
  const pantryByName = new Map(pantryList.map(item => [normalizeName(item?.name), item]));
  const asOf = new Date().toISOString().split('T')[0];

  const items = details.map(detail => {
    const pantryItem = pantryByName.get(normalizeName(detail.name));
    const pantryIngredient = detail.pantryIngredient !== false && (
      pantryNames.size === 0 || pantryNames.has(normalizeName(detail.name))
    );
    const quantity = detail.quantity || 1;
    const pantryUnitPrice = roundMoney(pantryItem?.estimatedUnitPrice);
    const estimatedUnitPrice = pantryIngredient && pantryUnitPrice > 0
      ? pantryUnitPrice
      : fallbackUnitPrice(detail.name, detail.unit);

    return {
      name: detail.name,
      quantity,
      unit: detail.unit,
      pantryIngredient,
      estimatedUnitPrice: roundMoney(estimatedUnitPrice),
      pricingUnit: pantryIngredient && pantryItem?.pricingUnit ? pantryItem.pricingUnit : detail.unit || 'item',
      estimatedCost: roundMoney(estimatedUnitPrice * Math.max(quantity, 1)),
      sourceLabel: pantryIngredient && pantryUnitPrice > 0 ? 'Pantry price' : 'Local fallback estimate',
      notes: pantryIngredient && pantryUnitPrice > 0
        ? 'Uses the unit price saved on this pantry item.'
        : 'Shown because the AI response did not include itemized pricing yet.',
    };
  });

  if (items.length === 0) return recipeData;

  const pantryMarketValue = roundMoney(items.filter(item => item.pantryIngredient).reduce((sum, item) => sum + item.estimatedCost, 0));
  const addedIngredientCost = roundMoney(items.filter(item => !item.pantryIngredient).reduce((sum, item) => sum + item.estimatedCost, 0));

  return {
    ...recipeData,
    costEstimate: {
      currency: 'PHP',
      locale: 'Philippines',
      asOf,
      totalCost: roundMoney(pantryMarketValue + addedIngredientCost),
      pantryMarketValue,
      addedIngredientCost,
      confidence: 'low',
      items,
      sources: [],
      notes: 'Low-confidence Philippines planning estimate. Actual store prices may vary.',
    },
  };
}
