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

  const plan = user.id === ADMIN_ID ? subscriptionPlans[2] : subscriptionPlans[1];

  return [
    {
      id: user.id === ADMIN_ID ? 'sub-admin' : 'sub-user',
      user_id: user.id,
      plan_id: plan.id,
      status: 'active',
      starts_at: '2026-04-25T00:00:00Z',
      ends_at: '2026-06-25T00:00:00Z',
      created_at: '2026-04-25T00:00:00Z',
      subscription_plans: plan,
    },
  ];
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
        { user_id: USER_ID, allergy_type_id: 'allergy-peanuts', severity: 'medium' },
      ];
    case 'ingredients':
      return ingredients;
    case 'pantry_items':
      return pantryItems;
    case 'saved_recipes':
      return savedRecipes;
    case 'recipes':
      return adminRecipes;
    case 'cooking_events':
      return [
        { user_id: USER_ID, recipe_id: 'recipe-fried-rice', event_type: 'rated', rating_value: 5 },
        { user_id: USER_ID, recipe_id: 'recipe-chicken-bowl', event_type: 'rated', rating_value: 4 },
      ];
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

  execute() {
    if (this.action === 'insert') {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
      return { data: rows.map((row, index) => ({ id: `mock-insert-${index + 1}`, ...row })), error: null };
    }

    if (this.action === 'update') {
      return { data: [], error: null };
    }

    if (this.action === 'delete') {
      return { data: [], error: null };
    }

    let rows = [...tableRows(this.tableName)];
    for (const filter of this.filters) {
      rows = rows.filter(filter);
    }

    if (this.orderBy) {
      rows.sort((a, b) => {
        const result = compareValues(readField(a, this.orderBy.field), readField(b, this.orderBy.field));
        return this.orderBy.ascending ? result : -result;
      });
    }

    if (this.limitCount !== null) {
      rows = rows.slice(0, this.limitCount);
    }

    if (this.singleResult || this.maybeSingleResult) {
      return { data: rows[0] ?? null, error: null };
    }

    return { data: rows, error: null };
  }
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
    async invoke(name) {
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
