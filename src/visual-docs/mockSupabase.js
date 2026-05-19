const USER_ID = 'visual-user';
const ADMIN_ID = 'visual-admin';
const HOUSEHOLD_ID = 'visual-household';

const now = new Date('2026-05-08T12:00:00Z');

const subscriptionPlans = [
  {
    id: 'plan-weekly',
    plan_code: 'weekly',
    display_name: 'Snack Starter',
    description: 'Weekly access for small households testing meal planning.',
    price_cents: 14900,
    currency: 'PHP',
    billing_period_days: 7,
    is_active: true,
    created_at: '2026-04-01T08:00:00Z',
  },
  {
    id: 'plan-monthly',
    plan_code: 'monthly',
    display_name: 'Kitchen Saver',
    description: 'Full pantry tracking, AI recipes, and Magic Scan for a month.',
    price_cents: 39900,
    currency: 'PHP',
    billing_period_days: 30,
    is_active: true,
    created_at: '2026-04-01T08:00:00Z',
  },
  {
    id: 'plan-yearly',
    plan_code: 'yearly',
    display_name: 'Zero-Waste Pro',
    description: 'Annual access for frequent cooks and larger households.',
    price_cents: 399900,
    currency: 'PHP',
    billing_period_days: 365,
    is_active: true,
    created_at: '2026-04-01T08:00:00Z',
  },
];

const dietTypes = [
  { id: 'diet-vegetarian', name: 'Vegetarian' },
  { id: 'diet-high-protein', name: 'High Protein' },
  { id: 'diet-low-carb', name: 'Low Carb' },
  { id: 'diet-pescatarian', name: 'Pescatarian' },
  { id: 'diet-gluten-free', name: 'Gluten Free' },
];

const allergyTypes = [
  { id: 'allergy-peanuts', name: 'Peanuts' },
  { id: 'allergy-shellfish', name: 'Shellfish' },
  { id: 'allergy-dairy', name: 'Dairy' },
  { id: 'allergy-eggs', name: 'Eggs' },
  { id: 'allergy-soy', name: 'Soy' },
];

const ingredients = [
  { id: 'ing-spinach', canonical_name: 'Spinach', category: 'Vegetables', default_unit: 'g' },
  { id: 'ing-tomatoes', canonical_name: 'Tomatoes', category: 'Vegetables', default_unit: 'pcs' },
  { id: 'ing-rice', canonical_name: 'Cooked Rice', category: 'Grains', default_unit: 'cups' },
  { id: 'ing-chicken', canonical_name: 'Chicken Breast', category: 'Protein', default_unit: 'g' },
  { id: 'ing-banana', canonical_name: 'Bananas', category: 'Fruits', default_unit: 'pcs' },
  { id: 'ing-eggs', canonical_name: 'egg', category: null, default_unit: 'pcs' },
];

const pantryItems = [
  {
    id: 'pantry-spinach',
    household_id: HOUSEHOLD_ID,
    ingredient_id: 'ing-spinach',
    quantity: 250,
    unit: 'g',
    status: 'available',
    source: 'manual',
    expires_at: '2026-05-10T00:00:00Z',
    created_at: '2026-05-04T09:15:00Z',
    created_by_user_id: USER_ID,
    ingredients: ingredients[0],
  },
  {
    id: 'pantry-tomatoes',
    household_id: HOUSEHOLD_ID,
    ingredient_id: 'ing-tomatoes',
    quantity: 6,
    unit: 'pcs',
    status: 'available',
    source: 'scan',
    expires_at: '2026-05-12T00:00:00Z',
    created_at: '2026-05-05T11:20:00Z',
    created_by_user_id: USER_ID,
    ingredients: ingredients[1],
  },
  {
    id: 'pantry-rice',
    household_id: HOUSEHOLD_ID,
    ingredient_id: 'ing-rice',
    quantity: 2,
    unit: 'cups',
    status: 'available',
    source: 'manual',
    expires_at: '2026-05-09T00:00:00Z',
    created_at: '2026-05-06T18:30:00Z',
    created_by_user_id: USER_ID,
    ingredients: ingredients[2],
  },
  {
    id: 'pantry-chicken',
    household_id: HOUSEHOLD_ID,
    ingredient_id: 'ing-chicken',
    quantity: 500,
    unit: 'g',
    status: 'available',
    source: 'manual',
    expires_at: '2026-05-11T00:00:00Z',
    created_at: '2026-05-07T08:45:00Z',
    created_by_user_id: USER_ID,
    ingredients: ingredients[3],
  },
  {
    id: 'pantry-eggs',
    household_id: HOUSEHOLD_ID,
    ingredient_id: 'ing-eggs',
    quantity: 3,
    unit: 'pcs',
    status: 'available',
    source: 'manual',
    expires_at: '2026-05-19T00:00:00Z',
    created_at: '2026-05-08T08:45:00Z',
    created_by_user_id: USER_ID,
    ingredients: ingredients[5],
  },
];

const adminRecipes = [
  {
    id: 'recipe-fried-rice',
    title: 'Spinach Tomato Fried Rice',
    instructions_json: [
      'Warm oil in a pan and saute chopped tomatoes until soft.',
      'Add cooked rice and spinach, then toss until heated through.',
      'Season with salt, pepper, and a squeeze of calamansi.',
    ],
    nutrition_json: { cals: 420, protein: '18g' },
    created_at: '2026-05-06T10:00:00Z',
    generated_by_user_id: USER_ID,
    recipe_ingredients: [
      { quantity: 2, unit: 'cups', ingredients: { canonical_name: 'Cooked Rice' } },
      { quantity: 150, unit: 'g', ingredients: { canonical_name: 'Spinach' } },
      { quantity: 3, unit: 'pcs', ingredients: { canonical_name: 'Tomatoes' } },
    ],
  },
  {
    id: 'recipe-chicken-bowl',
    title: 'Chicken Pantry Bowl',
    instructions_json: [
      'Sear chicken until browned and cooked through.',
      'Slice and serve over rice with fresh tomatoes.',
      'Top with herbs and a simple soy-calamansi dressing.',
    ],
    nutrition_json: { cals: 560, protein: '42g' },
    created_at: '2026-05-07T13:20:00Z',
    generated_by_user_id: USER_ID,
    recipe_ingredients: [
      { quantity: 250, unit: 'g', ingredients: { canonical_name: 'Chicken Breast' } },
      { quantity: 1, unit: 'cup', ingredients: { canonical_name: 'Cooked Rice' } },
      { quantity: 2, unit: 'pcs', ingredients: { canonical_name: 'Tomatoes' } },
    ],
  },
];

const savedRecipes = [
  {
    id: 'saved-fried-rice',
    user_id: USER_ID,
    saved_at: '2026-05-06T11:10:00Z',
    source: 'generated',
    recipes: adminRecipes[0],
  },
  {
    id: 'saved-chicken-bowl',
    user_id: USER_ID,
    saved_at: '2026-05-07T14:05:00Z',
    source: 'generated',
    recipes: adminRecipes[1],
  },
];

let userRows = [
  {
    user_id: USER_ID,
    email: 'cook@example.com',
    display_name: 'Demo Cook',
    role: 'user',
    created_at: '2026-04-20T08:00:00Z',
    subscription_status: 'active',
    plan_id: 'plan-monthly',
    plan_name: 'Kitchen Saver',
  },
  {
    user_id: ADMIN_ID,
    email: 'admin@example.com',
    display_name: 'Demo Admin',
    role: 'admin',
    created_at: '2026-04-15T08:00:00Z',
    subscription_status: 'active',
    plan_id: 'plan-yearly',
    plan_name: 'Zero-Waste Pro',
  },
  {
    user_id: 'visual-user-trial',
    email: 'trial@example.com',
    display_name: 'Trial User',
    role: 'user',
    created_at: '2026-05-01T08:00:00Z',
    subscription_status: 'trialing',
    plan_id: 'plan-weekly',
    plan_name: 'Snack Starter',
  },
];

let mockSequence = 1;

const pantryItemEvents = [];

const cookingEvents = [
  { user_id: USER_ID, recipe_id: 'recipe-fried-rice', event_type: 'rated', rating_value: 5 },
  { user_id: USER_ID, recipe_id: 'recipe-chicken-bowl', event_type: 'rated', rating_value: 4 },
];

const recipeIngredientRows = adminRecipes.flatMap(recipe => (
  recipe.recipe_ingredients.map((row, index) => {
    const ingredientName = row.ingredients?.canonical_name || '';
    const ingredient = ingredients.find(item => item.canonical_name.toLowerCase() === ingredientName.toLowerCase());
    return {
      id: `${recipe.id}-ingredient-${index + 1}`,
      recipe_id: recipe.id,
      ingredient_id: ingredient?.id || 'ing-rice',
      quantity: row.quantity || null,
      unit: row.unit || '',
    };
  })
));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nextId(prefix) {
  mockSequence += 1;
  return `${prefix}-${mockSequence}`;
}

function nextTimestamp() {
  mockSequence += 1;
  return new Date(now.getTime() + mockSequence * 60_000).toISOString();
}

function titleCaseIngredientName(name) {
  const cleanName = name?.trim().replace(/\s+/g, ' ');
  if (!cleanName) return '';

  const lower = cleanName.toLowerCase();
  if (lower === 'egg' || lower === 'eggs') return 'Eggs';

  return lower.replace(/\b[a-z]/g, letter => letter.toUpperCase());
}

function inferMockCategory(name) {
  const lowerName = name?.toLowerCase() || '';
  const categoryMap = [
    { category: 'Fruits', keywords: ['apple', 'banana', 'grape', 'orange', 'mango', 'berry', 'pear'] },
    { category: 'Vegetables', keywords: ['spinach', 'tomato', 'onion', 'garlic', 'carrot', 'lettuce', 'kale', 'pepper', 'mushroom'] },
    { category: 'Meat', keywords: ['chicken', 'beef', 'pork', 'turkey', 'ham'] },
    { category: 'Seafood', keywords: ['fish', 'shrimp', 'crab', 'tuna', 'salmon'] },
    { category: 'Protein', keywords: ['egg', 'tofu', 'tempeh'] },
    { category: 'Dairy', keywords: ['milk', 'cheese', 'butter', 'cream', 'yogurt'] },
    { category: 'Grains', keywords: ['rice', 'pasta', 'bread', 'flour', 'oats', 'lentil'] },
  ];
  return categoryMap.find(({ keywords }) => keywords.some(keyword => lowerName.includes(keyword)))?.category || 'Other';
}

function ingredientById(ingredientId) {
  return ingredients.find(ingredient => ingredient.id === ingredientId) || null;
}

function recipeById(recipeId) {
  return adminRecipes.find(recipe => recipe.id === recipeId) || null;
}

function hydratePantryItem(item) {
  return {
    ...item,
    ingredients: ingredientById(item.ingredient_id) || item.ingredients || null,
  };
}

function hydrateRecipeIngredient(row) {
  return {
    ...row,
    ingredients: ingredientById(row.ingredient_id) || null,
  };
}

function hydrateRecipe(recipe) {
  if (!recipe) return null;
  return {
    ...recipe,
    recipe_ingredients: recipeIngredientRows
      .filter(row => row.recipe_id === recipe.id)
      .map(hydrateRecipeIngredient),
  };
}

function savedRecipeRecipeId(savedRecipe) {
  return savedRecipe.recipe_id || savedRecipe.recipes?.id || null;
}

function hydrateSavedRecipe(savedRecipe) {
  const recipe = hydrateRecipe(recipeById(savedRecipeRecipeId(savedRecipe)));
  return {
    ...savedRecipe,
    recipe_id: recipe?.id || savedRecipeRecipeId(savedRecipe),
    recipes: recipe,
  };
}

function normalizeRows(payload) {
  return Array.isArray(payload) ? payload : [payload];
}

function matchesFilters(row, filters) {
  return filters.every(filter => filter(row));
}

function insertRows(tableName, payload) {
  return normalizeRows(payload).map(row => insertRow(tableName, row));
}

function insertRow(tableName, row) {
  if (tableName === 'ingredients') {
    const canonicalName = titleCaseIngredientName(row.canonical_name || row.name);
    const existing = ingredients.find(ingredient => ingredient.canonical_name.toLowerCase() === canonicalName.toLowerCase());
    if (existing) return clone(existing);

    const ingredient = {
      id: row.id || nextId('ing'),
      canonical_name: canonicalName,
      category: row.category || inferMockCategory(canonicalName),
      default_unit: row.default_unit || row.unit || 'pcs',
    };
    ingredients.push(ingredient);
    return clone(ingredient);
  }

  if (tableName === 'pantry_items') {
    const pantryItem = {
      id: row.id || nextId('pantry'),
      household_id: row.household_id || HOUSEHOLD_ID,
      ingredient_id: row.ingredient_id,
      quantity: row.quantity || 1,
      unit: row.unit || 'pcs',
      status: row.status || 'available',
      source: row.source || 'manual',
      expires_at: row.expires_at || null,
      created_at: row.created_at || nextTimestamp(),
      created_by_user_id: row.created_by_user_id || USER_ID,
    };
    pantryItems.push(pantryItem);
    return clone(hydratePantryItem(pantryItem));
  }

  if (tableName === 'pantry_item_events') {
    const event = { id: row.id || nextId('pantry-event'), created_at: row.created_at || nextTimestamp(), ...row };
    pantryItemEvents.push(event);
    return clone(event);
  }

  if (tableName === 'subscription_plans') {
    const plan = {
      id: row.id || nextId('plan'),
      currency: row.currency || 'PHP',
      created_at: row.created_at || nextTimestamp(),
      ...row,
    };
    subscriptionPlans.push(plan);
    return clone(plan);
  }

  if (tableName === 'recipes') {
    const recipe = {
      id: row.id || nextId('recipe'),
      title: row.title || 'Untitled Recipe',
      instructions_json: row.instructions_json || [],
      nutrition_json: row.nutrition_json || {},
      created_at: row.created_at || nextTimestamp(),
      generated_by_user_id: row.generated_by_user_id || USER_ID,
      model_provider: row.model_provider || 'mock',
    };
    adminRecipes.push(recipe);
    return clone(hydrateRecipe(recipe));
  }

  if (tableName === 'recipe_ingredients') {
    const recipeIngredient = {
      id: row.id || nextId('recipe-ingredient'),
      recipe_id: row.recipe_id,
      ingredient_id: row.ingredient_id,
      quantity: row.quantity || null,
      unit: row.unit || '',
    };
    recipeIngredientRows.push(recipeIngredient);
    return clone(hydrateRecipeIngredient(recipeIngredient));
  }

  if (tableName === 'saved_recipes') {
    const savedRecipe = {
      id: row.id || nextId('saved'),
      user_id: row.user_id || USER_ID,
      recipe_id: row.recipe_id,
      saved_at: row.saved_at || nextTimestamp(),
      source: row.source || 'generated',
    };
    savedRecipes.push(savedRecipe);
    return clone(hydrateSavedRecipe(savedRecipe));
  }

  if (tableName === 'cooking_events') {
    const event = { id: row.id || nextId('cooking-event'), created_at: row.created_at || nextTimestamp(), ...row };
    cookingEvents.push(event);
    return clone(event);
  }

  return { id: row.id || nextId('mock-insert'), ...row };
}

function updateRows(tableName, filters, payload) {
  if (tableName === 'subscription_plans') {
    const updated = subscriptionPlans.filter(row => matchesFilters(row, filters));
    updated.forEach(row => Object.assign(row, payload));
    return updated.map(clone);
  }

  if (tableName === 'ingredients') {
    const updated = ingredients.filter(row => matchesFilters(row, filters));
    updated.forEach(row => Object.assign(row, payload));
    return updated.map(clone);
  }

  if (tableName === 'pantry_items') {
    const updated = pantryItems.filter(row => matchesFilters(hydratePantryItem(row), filters));
    updated.forEach(row => Object.assign(row, payload));
    return updated.map(row => clone(hydratePantryItem(row)));
  }

  if (tableName === 'recipes') {
    const updated = adminRecipes.filter(row => matchesFilters(hydrateRecipe(row), filters));
    updated.forEach(row => Object.assign(row, payload));
    return updated.map(row => clone(hydrateRecipe(row)));
  }

  if (tableName === 'app_user_profiles') {
    const updated = userRows.filter(row => matchesFilters({ user_id: row.user_id, role: row.role, display_name: row.display_name }, filters));
    updated.forEach(row => {
      if (payload.role !== undefined) row.role = payload.role;
      if (payload.display_name !== undefined) row.display_name = payload.display_name;
    });
    return updated.map(row => clone({ user_id: row.user_id, role: row.role, display_name: row.display_name }));
  }

  if (tableName === 'user_subscriptions') {
    const matchedSubscriptions = subscriptionRows().filter(row => matchesFilters(row, filters));
    matchedSubscriptions.forEach(subscription => {
      const user = userRows.find(row => row.user_id === subscription.user_id);
      if (!user) return;
      if (payload.status !== undefined) user.subscription_status = payload.status;
      if (payload.plan_id !== undefined) {
        user.plan_id = payload.plan_id;
        user.plan_name = subscriptionPlans.find(plan => plan.id === payload.plan_id)?.display_name || null;
      }
    });
    return matchedSubscriptions.map(row => clone({ ...row, ...payload }));
  }

  return [];
}

function deleteRows(tableName, filters) {
  if (tableName === 'subscription_plans') {
    const deleted = subscriptionPlans.filter(row => matchesFilters(row, filters));
    for (const row of deleted) {
      const index = subscriptionPlans.findIndex(plan => plan.id === row.id);
      if (index >= 0) subscriptionPlans.splice(index, 1);
    }
    return deleted.map(clone);
  }

  if (tableName === 'saved_recipes') {
    const deleted = savedRecipes.filter(row => matchesFilters(hydrateSavedRecipe(row), filters));
    for (const row of deleted) {
      const index = savedRecipes.findIndex(savedRecipe => savedRecipe.id === row.id);
      if (index >= 0) savedRecipes.splice(index, 1);
    }
    return deleted.map(row => clone(hydrateSavedRecipe(row)));
  }

  if (tableName === 'recipe_ingredients') {
    const deleted = recipeIngredientRows.filter(row => matchesFilters(hydrateRecipeIngredient(row), filters));
    for (const row of deleted) {
      const index = recipeIngredientRows.findIndex(recipeIngredient => recipeIngredient.id === row.id);
      if (index >= 0) recipeIngredientRows.splice(index, 1);
    }
    return deleted.map(row => clone(hydrateRecipeIngredient(row)));
  }

  if (tableName === 'recipes') {
    const deleted = adminRecipes.filter(row => matchesFilters(hydrateRecipe(row), filters));
    for (const row of deleted) {
      const recipeIndex = adminRecipes.findIndex(recipe => recipe.id === row.id);
      if (recipeIndex >= 0) adminRecipes.splice(recipeIndex, 1);
      for (let index = recipeIngredientRows.length - 1; index >= 0; index -= 1) {
        if (recipeIngredientRows[index].recipe_id === row.id) recipeIngredientRows.splice(index, 1);
      }
      for (let index = savedRecipes.length - 1; index >= 0; index -= 1) {
        if (savedRecipeRecipeId(savedRecipes[index]) === row.id) savedRecipes.splice(index, 1);
      }
    }
    return deleted.map(row => clone(hydrateRecipe(row)));
  }

  if (tableName === 'cooking_events') {
    const deleted = cookingEvents.filter(row => matchesFilters(row, filters));
    for (const row of deleted) {
      const index = cookingEvents.findIndex(event => event.id === row.id);
      if (index >= 0) cookingEvents.splice(index, 1);
    }
    return deleted.map(clone);
  }

  return [];
}

function getUrl() {
  if (typeof window === 'undefined') {
    return new URL('http://localhost/pantry');
  }

  return new URL(window.location.href);
}

function getVisualRole() {
  const url = getUrl();
  const forced = url.searchParams.get('visualRole');
  if (forced) return forced;
  if (url.pathname === '/admin') return 'admin';
  if (url.pathname === '/login' || url.pathname === '/register' || url.pathname === '/') return 'guest';
  return 'user';
}

function getSessionUser() {
  const url = getUrl();
  const role = getVisualRole();

  if (role === 'guest') return null;

  if (url.pathname === '/reset-password') {
    const hasRecoveryParams =
      url.searchParams.get('type') === 'recovery' ||
      url.searchParams.has('code') ||
      url.hash.includes('type=recovery');
    if (!hasRecoveryParams && sessionStorage.getItem('password-recovery-active') !== 'true') {
      return null;
    }
  }

  if (role === 'admin') {
    return {
      id: ADMIN_ID,
      email: 'admin@example.com',
      user_metadata: { display_name: 'Demo Admin' },
    };
  }

  return {
    id: USER_ID,
    email: 'cook@example.com',
    user_metadata: { display_name: 'Demo Cook' },
  };
}

function getSession() {
  const user = getSessionUser();
  if (!user) return null;
  return {
    access_token: 'visual-docs-token',
    token_type: 'bearer',
    expires_at: Math.floor(now.getTime() / 1000) + 3600,
    user,
  };
}

function isOnboardedPage() {
  const url = getUrl();
  return !['/subscription', '/onboarding', '/payment/success', '/payment/cancel'].includes(url.pathname);
}

function hasActiveSubscriptionForRoute() {
  const url = getUrl();
  return !['/subscription', '/payment/success', '/payment/cancel'].includes(url.pathname);
}

function profileRows() {
  const user = getSessionUser();
  if (!user) return [];
  const isAdmin = user.id === ADMIN_ID;

  return [
    {
      id: isAdmin ? 'profile-admin' : 'profile-user',
      user_id: user.id,
      role: isAdmin ? 'admin' : 'user',
      display_name: isAdmin ? 'Demo Admin' : 'Demo Cook',
      onboarding_completed_at: isAdmin || isOnboardedPage() ? '2026-04-25T10:00:00Z' : null,
      created_at: '2026-04-20T08:00:00Z',
      recipe_preferences: isAdmin ? {} : {
        customDiets: ['Low-sodium', 'No pork'],
        customAllergies: [{ name: 'Sesame', severity: 'mild' }],
        noAllergies: false,
        avoidCrossContamination: true,
        exclusions: ['Alcohol', 'Mushrooms'],
        cuisines: ['Filipino', 'Japanese'],
        favoriteIngredients: ['Tofu', 'Garlic'],
        dislikedIngredients: ['Bitter melon'],
        mealTypes: ['Dinner', 'Meal prep'],
        cookingTime: '30-min',
        budget: 'budget',
        skillLevel: 'beginner',
        servings: 3,
        calorieTarget: '500 per meal',
        proteinTarget: '30g+',
        carbTarget: 'under 45g',
        notes: 'Keep recipes practical for weeknights.',
      },
    },
  ];
}

function householdRows() {
  return [
    { id: 'member-user', user_id: USER_ID, household_id: HOUSEHOLD_ID, role: 'owner' },
    { id: 'member-admin', user_id: ADMIN_ID, household_id: HOUSEHOLD_ID, role: 'owner' },
  ];
}

function subscriptionRows() {
  const user = getSessionUser();
  if (!user || !hasActiveSubscriptionForRoute()) return [];

  return userRows
    .filter(row => row.user_id === user.id && row.subscription_status)
    .map(row => {
      const plan = subscriptionPlans.find(item => item.id === row.plan_id) || subscriptionPlans[1];
      return {
        id: `sub-${row.user_id}`,
        user_id: row.user_id,
        plan_id: plan?.id || row.plan_id,
        status: row.subscription_status,
        starts_at: '2026-04-25T00:00:00Z',
        ends_at: '2026-06-25T00:00:00Z',
        created_at: '2026-04-25T00:00:00Z',
        subscription_plans: plan,
      };
    });
}

function paymentAttemptRows() {
  return [
    {
      id: 'mock-pending',
      user_id: USER_ID,
      plan_id: 'plan-monthly',
      status: 'pending',
      paymongo_checkout_session_id: 'checkout_mock_pending',
      subscription_id: null,
      created_at: '2026-05-08T08:30:00Z',
      subscription_plans: subscriptionPlans[1],
    },
    {
      id: 'mock-canceled',
      user_id: USER_ID,
      plan_id: 'plan-monthly',
      status: 'failed',
      paymongo_checkout_session_id: 'checkout_mock_canceled',
      subscription_id: null,
      created_at: '2026-05-08T08:45:00Z',
      subscription_plans: subscriptionPlans[1],
    },
  ];
}

function tableRows(tableName) {
  switch (tableName) {
    case 'app_user_profiles':
      return profileRows();
    case 'household_members':
      return householdRows();
    case 'user_subscriptions':
      return subscriptionRows();
    case 'subscription_plans':
      return subscriptionPlans;
    case 'diet_types':
      return dietTypes;
    case 'allergy_types':
      return allergyTypes;
    case 'user_diet_preferences':
      return [
        { user_id: USER_ID, diet_type_id: 'diet-high-protein' },
        { user_id: USER_ID, diet_type_id: 'diet-low-carb' },
      ];
    case 'user_allergy_preferences':
      return [
        { user_id: USER_ID, allergy_type_id: 'allergy-eggs', severity: 'severe' },
      ];
    case 'ingredients':
      return ingredients.map(clone);
    case 'pantry_items':
      return pantryItems.map(item => clone(hydratePantryItem(item)));
    case 'saved_recipes':
      return savedRecipes.map(hydrateSavedRecipe).filter(row => row.recipes).map(clone);
    case 'recipes':
      return adminRecipes.map(recipe => clone(hydrateRecipe(recipe)));
    case 'recipe_ingredients':
      return recipeIngredientRows.map(row => clone(hydrateRecipeIngredient(row)));
    case 'cooking_events':
      return cookingEvents.map(clone);
    case 'paymongo_checkout_sessions':
      return paymentAttemptRows();
    default:
      return [];
  }
}

function readField(row, field) {
  return field.split('.').reduce((value, key) => value?.[key], row);
}

function compareValues(a, b) {
  const dateA = Date.parse(a);
  const dateB = Date.parse(b);
  if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) return dateA - dateB;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a ?? '').localeCompare(String(b ?? ''));
}

class MockQuery {
  constructor(tableName) {
    this.tableName = tableName;
    this.action = 'select';
    this.payload = null;
    this.filters = [];
    this.orderBy = null;
    this.limitCount = null;
    this.singleResult = false;
    this.maybeSingleResult = false;
  }

  select() {
    return this;
  }

  insert(payload) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(field, value) {
    this.filters.push(row => readField(row, field) === value);
    return this;
  }

  neq(field, value) {
    this.filters.push(row => readField(row, field) !== value);
    return this;
  }

  gt(field, value) {
    this.filters.push(row => compareValues(readField(row, field), value) > 0);
    return this;
  }

  in(field, values) {
    this.filters.push(row => values.includes(readField(row, field)));
    return this;
  }

  ilike(field, value) {
    const expected = String(value ?? '').toLowerCase();
    this.filters.push(row => String(readField(row, field) ?? '').toLowerCase() === expected);
    return this;
  }

  or() {
    return this;
  }

  order(field, options = {}) {
    this.orderBy = { field, ascending: options.ascending !== false };
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.singleResult = true;
    return this.thenable();
  }

  maybeSingle() {
    this.maybeSingleResult = true;
    return this.thenable();
  }

  then(resolve, reject) {
    return this.thenable().then(resolve, reject);
  }

  thenable() {
    return Promise.resolve(this.execute());
  }

  formatResult(rows) {
    let resultRows = [...rows];

    if (this.orderBy) {
      resultRows.sort((a, b) => {
        const result = compareValues(readField(a, this.orderBy.field), readField(b, this.orderBy.field));
        return this.orderBy.ascending ? result : -result;
      });
    }

    if (this.limitCount !== null) {
      resultRows = resultRows.slice(0, this.limitCount);
    }

    if (this.singleResult || this.maybeSingleResult) {
      return { data: resultRows[0] ?? null, error: null };
    }

    return { data: resultRows, error: null };
  }

  execute() {
    let rows;

    if (this.action === 'insert') {
      rows = insertRows(this.tableName, this.payload);
      return this.formatResult(rows);
    }

    if (this.action === 'update') {
      rows = updateRows(this.tableName, this.filters, this.payload);
      return this.formatResult(rows);
    }

    if (this.action === 'delete') {
      rows = deleteRows(this.tableName, this.filters);
      return this.formatResult(rows);
    }

    rows = [...tableRows(this.tableName)];
    for (const filter of this.filters) {
      rows = rows.filter(filter);
    }

    return this.formatResult(rows);
  }
}

function mockValidateIngredient(payload = {}) {
  const name = titleCaseIngredientName(payload.name);
  const lowerName = name.toLowerCase();
  const nonFoodTerms = ['phone', 'laptop', 'soap', 'chair', 'plastic', 'paper', 'rock'];
  const isFood = !!name && !nonFoodTerms.some(term => lowerName.includes(term));
  const allergyList = Array.isArray(payload.allergyList) ? payload.allergyList.map(item => String(item).toLowerCase()) : [];
  const allergyConflict = allergyList.some(allergy => allergy && lowerName.includes(allergy.replace(/s$/, '')));

  return {
    isFood,
    correctedName: name,
    category: inferMockCategory(name),
    estimatedExpiryDate: '2026-06-30',
    dietConflict: false,
    allergyConflict,
    warning: allergyConflict ? `${name} may conflict with your allergy preferences.` : null,
    reason: isFood ? null : `"${payload.name}" is not a valid food ingredient.`,
  };
}

function mockGenerateRecipe(payload = {}) {
  const pantryItems = Array.isArray(payload.pantryItems) ? payload.pantryItems : [];
  const ingredientList = Array.isArray(payload.ingredientList) ? payload.ingredientList : [];
  const firstItemName = pantryItems[0]?.name || ingredientList[0]?.replace(/^[\d.\s]+[a-zA-Z]*\s*/, '') || 'Pantry';
  const title = `${titleCaseIngredientName(firstItemName)} Pantry Recipe`;

  return {
    title,
    ingredients: ingredientList.length > 0 ? ingredientList : pantryItems.map(item => `${item.quantity} ${item.unit} ${item.name}`),
    ingredientDetails: pantryItems.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
    })),
    instructions: [
      'Prep the selected ingredients and keep everything within reach.',
      'Cook over medium heat until the ingredients are tender and well seasoned.',
      'Serve warm and adjust seasoning to taste.',
    ],
    nutrition: { cals: 420, protein: '22g' },
  };
}

function mockAiResponse(action, payload = {}) {
  if (action === 'validateIngredient') return mockValidateIngredient(payload);
  if (action === 'generateRecipe') return mockGenerateRecipe(payload);
  if (action === 'scanIngredientsFromImage' || action === 'scanIngredientsFromText') {
    return {
      ingredients: [
        { name: 'Tomatoes', quantity: 3, unit: 'pcs', category: 'Vegetables' },
        { name: 'Cooked Rice', quantity: 2, unit: 'cups', category: 'Grains' },
      ],
    };
  }
  if (action === 'chatAboutSavedIngredients') {
    return { answer: 'Use the saved recipes as a base and adjust seasoning to taste.' };
  }
  return {};
}

export const mockSupabase = {
  auth: {
    async getSession() {
      return { data: { session: getSession() }, error: null };
    },
    onAuthStateChange(callback) {
      setTimeout(() => callback('SIGNED_IN', getSession()), 0);
      return { data: { subscription: { unsubscribe() {} } } };
    },
    async signInWithPassword() {
      return { data: { session: getSession() }, error: null };
    },
    async signUp() {
      return { data: { session: getSession() }, error: null };
    },
    async signOut() {
      return { error: null };
    },
    async resetPasswordForEmail() {
      return { data: {}, error: null };
    },
    async updateUser() {
      return { data: { user: getSessionUser() }, error: null };
    },
    async exchangeCodeForSession() {
      sessionStorage.setItem('password-recovery-active', 'true');
      return { data: { session: getSession() }, error: null };
    },
    async verifyOtp() {
      return { data: { session: getSession() }, error: null };
    },
    async setSession() {
      return { data: { session: getSession() }, error: null };
    },
  },
  from(tableName) {
    return new MockQuery(tableName);
  },
  channel() {
    return {
      on() {
        return this;
      },
      subscribe() {
        return this;
      },
    };
  },
  removeChannel() {},
  functions: {
    async invoke(name, options = {}) {
      if (name === 'ai') {
        const { action, payload } = options.body || {};
        return { data: mockAiResponse(action, payload), error: null };
      }
      if (name === 'verify-paymongo-checkout') {
        return { data: { status: 'pending' }, error: null };
      }
      return {
        data: { checkout_url: 'https://checkout.paymongo.com/mock-session' },
        error: null,
      };
    },
  },
  async rpc(name, params = {}) {
    if (name === 'admin_list_users') {
      return { data: userRows, error: null };
    }
    if (name === 'admin_get_stats') {
      return {
        data: {
          total_users: userRows.length,
          active_subscriptions: 2,
          total_pantry_items: pantryItems.length,
          total_recipes: adminRecipes.length,
        },
        error: null,
      };
    }
    if (name === 'admin_delete_user') {
      userRows = userRows.filter(row => row.user_id !== params.target_user_id);
      return {
        data: {
          user_id: params.target_user_id,
          deleted_profile: true,
          deleted_auth_user: true,
        },
        error: null,
      };
    }
    if (name === 'admin_prune_auth_user_mismatches') {
      return {
        data: {
          deleted_profiles_without_auth: 0,
          deleted_auth_users_without_profile: 0,
        },
        error: null,
      };
    }
    return { data: null, error: null };
  },
};
