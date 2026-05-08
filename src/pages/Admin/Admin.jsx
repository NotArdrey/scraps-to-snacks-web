import { useCallback, useState, useEffect, useContext, useMemo } from 'react';
import {
  Shield, Users, CreditCard, Package, ChefHat, BarChart3, ToggleLeft, ToggleRight,
  LogOut, Moon, Sun, Pencil, Trash2, Plus, RefreshCw, Download, ArrowUpRight,
  TrendingUp, TrendingDown, AlertTriangle, Clock, PieChart, DollarSign, Activity,
  Minus, Check, X,
} from 'lucide-react';
import {
  fetchAllUsers, fetchAdminStats, fetchAllPlans, togglePlanActive,
  fetchAllPantryItems, fetchAllRecipes, fetchAllHouseholds,
  updateUserRole, deleteUserProfile, updateUserSubscription, pruneAuthUserMismatches,
  createPlan, updatePlan, deletePlan,
  adminCreatePantryItem, updatePantryItem, deletePantryItem,
  adminCreateRecipe, adminUpdateRecipe, deleteRecipe,
} from '../../services/admin';
import { formatPlanPrice } from '../../services/subscription';
import { AppContext } from '../../AppContextValue';
import BrandIcon from '../../components/BrandIcon';
import ConfirmModal from '../../components/ConfirmModal';
import FeedbackModal from '../../components/FeedbackModal';
import AdminFormModal from '../../components/AdminFormModal';
import LoadingPanel from '../../components/LoadingPanel';
import { CATEGORIES, UNITS } from '../../constants/categories';

const TABS = [
  { key: 'stats', label: 'Dashboard', icon: BarChart3 },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'plans', label: 'Plans', icon: CreditCard },
  { key: 'pantry', label: 'Pantry', icon: Package },
  { key: 'recipes', label: 'Recipes', icon: ChefHat },
];

export default function Admin() {
  const { signOut, theme, toggleTheme, user } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [pantryItems, setPantryItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [households, setHouseholds] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [statsData, usersData, plansData, pantryData, recipesData, householdData] = await Promise.all([
      fetchAdminStats(), fetchAllUsers(), fetchAllPlans(),
      fetchAllPantryItems(), fetchAllRecipes(), fetchAllHouseholds(),
    ]);
    setStats(statsData);
    setUsers(usersData);
    setPlans(plansData);
    setPantryItems(pantryData);
    setRecipes(recipesData);
    setHouseholds(householdData);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(loadData, 0);
    return () => clearTimeout(timeoutId);
  }, [loadData]);

  const handleTogglePlan = async (planId, currentActive) => {
    const { error } = await togglePlanActive(planId, !currentActive);
    if (error) {
      setFeedback({
        title: 'Plan update failed',
        message: error.message || 'Unable to update plan status.',
        variant: 'error',
      });
      return;
    }
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, is_active: !currentActive } : p));
    setFeedback({
      title: 'Plan status updated',
      message: `The plan was ${currentActive ? 'deactivated' : 'activated'} successfully.`,
      variant: 'success',
    });
  };

  const showConfirm = (title, message, onConfirm, variant = 'danger', successMessage = 'Action completed successfully.') => {
    setConfirmModal({ title, message, onConfirm, variant, successMessage });
  };
  const showFeedback = (nextFeedback) => setFeedback(nextFeedback);
  const closeConfirm = () => setConfirmModal(null);
  const closeFeedback = () => setFeedback(null);
  const confirmAdminLogout = async () => {
    setShowLogoutConfirm(false);
    try {
      await signOut();
    } catch (err) {
      setFeedback({
        title: 'Sign out failed',
        message: err.message || 'Unable to sign out. Please try again.',
        variant: 'error',
      });
    }
  };
  const openTab = (tabKey) => {
    setPendingAction(null);
    setActiveTab(tabKey);
  };
  const triggerAction = (tabKey, action) => {
    setPendingAction({ tabKey, action, nonce: Date.now() });
    setActiveTab(tabKey);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const panelStyle = { background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' };
  const thStyle = { padding: '0.85rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', background: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)' };
  const tdStyle = { padding: '0.85rem 1.25rem', fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' };
  const badgeStyle = (color) => ({ padding: '0.15rem 0.55rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', background: `${color}18`, color });

  if (loading) {
    return <LoadingPanel title="Loading admin dashboard" message="Fetching users, plans, pantry items, and recipes." />;
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <BrandIcon size={28} />
          <span className="brand-text">Scraps<span className="brand-text-accent">2</span>Snacks</span>
        </div>
        <div className="admin-sidebar-badge">
          <Shield size={14} />
          <span>Admin Panel</span>
        </div>
        <nav className="admin-sidebar-nav" aria-label="Admin sections">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => { setPendingAction(null); setActiveTab(tab.key); }}
                className={`admin-sidebar-link${activeTab === tab.key ? ' active' : ''}`}
                title={tab.label}
                aria-label={`Open ${tab.label}`}
                aria-current={activeTab === tab.key ? 'page' : undefined}
              >
                <Icon size={18} /><span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-profile">
            <span>Admin</span>
            <strong>{user?.email || 'Signed in'}</strong>
          </div>
          <button onClick={toggleTheme} className="admin-sidebar-link" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button onClick={() => setShowLogoutConfirm(true)} className="admin-sidebar-link admin-sidebar-logout" title="Sign out" aria-label="Sign out">
            <LogOut size={18} /><span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        {activeTab === 'stats' && <StatsTab stats={stats} users={users} plans={plans} pantryItems={pantryItems} recipes={recipes} onNavigate={openTab} onAction={triggerAction} onRefresh={loadData} />}
        {activeTab === 'users' && <UsersTab users={users} setUsers={setUsers} plans={plans} currentUserId={user?.id} formatDate={formatDate} badgeStyle={badgeStyle} panelStyle={panelStyle} thStyle={thStyle} tdStyle={tdStyle} showConfirm={showConfirm} showFeedback={showFeedback} />}
        {activeTab === 'plans' && <PlansTab plans={plans} setPlans={setPlans} onToggle={handleTogglePlan} badgeStyle={badgeStyle} panelStyle={panelStyle} thStyle={thStyle} tdStyle={tdStyle} showConfirm={showConfirm} showFeedback={showFeedback} pendingAction={pendingAction?.tabKey === 'plans' ? pendingAction : null} />}
        {activeTab === 'pantry' && <PantryTab items={pantryItems} setItems={setPantryItems} households={households} userId={user?.id} formatDate={formatDate} panelStyle={panelStyle} thStyle={thStyle} tdStyle={tdStyle} showConfirm={showConfirm} showFeedback={showFeedback} pendingAction={pendingAction?.tabKey === 'pantry' ? pendingAction : null} />}
        {activeTab === 'recipes' && <RecipesTab recipes={recipes} setRecipes={setRecipes} userId={user?.id} formatDate={formatDate} panelStyle={panelStyle} thStyle={thStyle} tdStyle={tdStyle} showConfirm={showConfirm} showFeedback={showFeedback} pendingAction={pendingAction?.tabKey === 'recipes' ? pendingAction : null} />}
      </main>

      <ConfirmModal
        open={!!confirmModal}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        confirmText={confirmModal?.confirmText || 'Delete'}
        variant={confirmModal?.variant || 'danger'}
        onConfirm={async () => {
          try {
            await confirmModal?.onConfirm?.();
            const successMessage = confirmModal?.successMessage;
            closeConfirm();
            if (successMessage) {
              setFeedback({
                title: 'Done',
                message: successMessage,
                variant: 'success',
              });
            }
          } catch (err) {
            closeConfirm();
            setFeedback({
              title: 'Action failed',
              message: err.message || 'Unable to complete this action. Please try again.',
              variant: 'error',
            });
          }
        }}
        onCancel={closeConfirm}
      />
      <ConfirmModal
        open={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out of the admin panel?"
        confirmText="Sign Out"
        variant="logout"
        onConfirm={confirmAdminLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
      <FeedbackModal
        open={!!feedback}
        title={feedback?.title}
        message={feedback?.message}
        variant={feedback?.variant}
        onClose={closeFeedback}
      />
    </div>
  );
}

/* ─── Stats Tab ─────────────────────────────────────────────────── */

const DATE_RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

function parseDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function countSince(items, dateKey, startDate, endDate = new Date()) {
  if (!startDate) return items.length;
  return items.filter(item => {
    const date = parseDate(item?.[dateKey]);
    return date && date >= startDate && date <= endDate;
  }).length;
}

function percentChange(current, previous) {
  if (!previous && !current) return 0;
  if (!previous) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

function formatCurrencyCents(cents, currency = 'PHP') {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
}

function formatDashboardDate(value) {
  const date = parseDate(value);
  if (!date) return 'No date';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildSeries(items, dateKey, selectedDays) {
  const now = new Date();
  const windowDays = selectedDays || 120;
  const bucketCount = 8;
  const bucketSize = Math.max(1, Math.ceil(windowDays / bucketCount));
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (bucketSize * bucketCount) + 1);

  return Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = new Date(start);
    bucketStart.setDate(start.getDate() + (index * bucketSize));
    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketStart.getDate() + bucketSize);

    const value = items.filter(item => {
      const date = parseDate(item?.[dateKey]);
      return date && date >= bucketStart && date < bucketEnd;
    }).length;

    return {
      label: bucketStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value,
    };
  });
}

function StatsTab({ stats, users, plans, pantryItems, recipes, onNavigate, onAction, onRefresh }) {
  const [range, setRange] = useState('30');

  const dashboard = useMemo(() => {
    const now = new Date();
    const selectedDays = range === 'all' ? null : Number(range);
    const currentStart = selectedDays ? new Date(now.getTime() - selectedDays * 24 * 60 * 60 * 1000) : null;
    const previousStart = selectedDays ? new Date(now.getTime() - selectedDays * 2 * 24 * 60 * 60 * 1000) : null;

    const usersCurrent = countSince(users, 'created_at', currentStart, now);
    const usersPrevious = selectedDays ? countSince(users, 'created_at', previousStart, currentStart) : 0;
    const recipesCurrent = countSince(recipes, 'created_at', currentStart, now);
    const recipesPrevious = selectedDays ? countSince(recipes, 'created_at', previousStart, currentStart) : 0;

    const activeUsers = users.filter(u => ['active', 'trialing'].includes(u.subscription_status));
    const inactiveUsers = Math.max(users.length - activeUsers.length, 0);
    const planById = new Map(plans.map(plan => [plan.id, plan]));
    const planCounts = activeUsers.reduce((acc, item) => {
      const label = item.plan_name || planById.get(item.plan_id)?.display_name || 'No plan name';
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    const planBreakdown = Object.entries(planCounts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const mrrCents = activeUsers.reduce((total, item) => {
      const plan = planById.get(item.plan_id) || plans.find(p => p.display_name === item.plan_name);
      if (!plan?.price_cents) return total;
      const periodDays = plan.billing_period_days || 30;
      return total + Math.round(plan.price_cents * (30 / periodDays));
    }, 0);

    const recentUsers = [...users]
      .sort((a, b) => (parseDate(b.created_at)?.getTime() || 0) - (parseDate(a.created_at)?.getTime() || 0))
      .slice(0, 5);
    const recentRecipes = [...recipes]
      .sort((a, b) => (parseDate(b.created_at)?.getTime() || 0) - (parseDate(a.created_at)?.getTime() || 0))
      .slice(0, 4);
    const lowPantry = pantryItems
      .filter(item => Number(item.quantity) <= 2)
      .sort((a, b) => Number(a.quantity) - Number(b.quantity))
      .slice(0, 4);

    return {
      selectedDays,
      totalUsers: stats?.total_users ?? users.length,
      activeSubscriptions: stats?.active_subscriptions ?? activeUsers.length,
      pantryTotal: stats?.total_pantry_items ?? pantryItems.length,
      totalRecipes: stats?.total_recipes ?? recipes.length,
      usersCurrent,
      recipesCurrent,
      userTrend: percentChange(usersCurrent, usersPrevious),
      recipeTrend: percentChange(recipesCurrent, recipesPrevious),
      activeRate: users.length ? Math.round((activeUsers.length / users.length) * 100) : 0,
      inactiveUsers,
      mrrCents,
      currency: plans[0]?.currency || 'PHP',
      planBreakdown,
      popularPlan: planBreakdown[0]?.label || 'None yet',
      recentUsers,
      recentRecipes,
      lowPantry,
      userSeries: buildSeries(users, 'created_at', selectedDays),
      recipeSeries: buildSeries(recipes, 'created_at', selectedDays),
    };
  }, [range, stats, users, plans, pantryItems, recipes]);

  const exportDashboard = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      range: DATE_RANGE_OPTIONS.find(option => option.value === range)?.label,
      metrics: {
        total_users: dashboard.totalUsers,
        active_subscriptions: dashboard.activeSubscriptions,
        monthly_revenue: dashboard.mrrCents / 100,
        pantry_items: dashboard.pantryTotal,
        total_recipes: dashboard.totalRecipes,
        popular_plan: dashboard.popularPlan,
      },
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `scraps-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const cards = [
    {
      label: 'Total Users',
      value: dashboard.totalUsers,
      detail: `+${dashboard.usersCurrent} in selected period`,
      trend: dashboard.userTrend,
      icon: Users,
      color: '#7a5ed3',
      target: 'users',
    },
    {
      label: 'Active Subscriptions',
      value: dashboard.activeSubscriptions,
      detail: `${dashboard.activeRate}% of users active`,
      trend: dashboard.activeRate,
      icon: CreditCard,
      color: '#10b981',
      target: 'plans',
    },
    {
      label: 'Monthly Revenue',
      value: formatCurrencyCents(dashboard.mrrCents, dashboard.currency),
      detail: `${dashboard.popularPlan} leads plan mix`,
      trend: dashboard.mrrCents > 0 ? 100 : 0,
      icon: DollarSign,
      color: '#06b6d4',
      target: 'plans',
    },
    {
      label: 'Total Recipes',
      value: dashboard.totalRecipes,
      detail: `+${dashboard.recipesCurrent} in selected period`,
      trend: dashboard.recipeTrend,
      icon: ChefHat,
      color: '#ef4444',
      target: 'recipes',
    },
  ];

  const maxUserSeries = Math.max(...dashboard.userSeries.map(point => point.value), 1);
  const maxRecipeSeries = Math.max(...dashboard.recipeSeries.map(point => point.value), 1);
  const maxPlanCount = Math.max(...dashboard.planBreakdown.map(item => item.value), 1);

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of users, subscriptions, pantry, and recipes</p>
        </div>
        <div className="admin-dashboard-controls">
          <select value={range} onChange={e => setRange(e.target.value)} aria-label="Dashboard date range">
            {DATE_RANGE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <button type="button" className="btn-secondary" onClick={onRefresh}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button type="button" className="btn-secondary" onClick={exportDashboard}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="admin-stats-grid">
        {cards.map(card => {
          const Icon = card.icon;
          const TrendIcon = card.trend >= 0 ? TrendingUp : TrendingDown;
          return (
            <button key={card.label} type="button" className="glass-card admin-stat-card admin-stat-card-button" onClick={() => onNavigate(card.target)}>
              <div className="admin-stat-card-top">
                <span className="admin-stat-icon" style={{ background: `${card.color}18`, color: card.color }}>
                  <Icon size={24} />
                </span>
                <ArrowUpRight size={17} className="admin-stat-open-icon" />
              </div>
              <strong>{card.value}</strong>
              <span className="admin-stat-label">{card.label}</span>
              <span className={`admin-stat-trend${card.trend < 0 ? ' negative' : ''}`}>
                <TrendIcon size={15} />
                {Math.abs(card.trend)}% {card.detail}
              </span>
            </button>
          );
        })}
      </div>

      <div className="admin-dashboard-grid">
        <section className="glass-card admin-dashboard-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>User Growth</h2>
              <p>Signups across the selected range</p>
            </div>
            <Activity size={18} />
          </div>
          <div className="admin-bar-chart">
            {dashboard.userSeries.map(point => (
              <div key={point.label} className="admin-bar-column">
                <div className="admin-bar-track">
                  <span style={{ height: `${Math.max((point.value / maxUserSeries) * 100, point.value ? 12 : 3)}%` }} />
                </div>
                <small>{point.label}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card admin-dashboard-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Subscription Breakdown</h2>
              <p>{dashboard.activeSubscriptions} active, {dashboard.inactiveUsers} inactive</p>
            </div>
            <PieChart size={18} />
          </div>
          <div className="admin-breakdown-list">
            {dashboard.planBreakdown.length === 0 ? (
              <p className="admin-empty-text">No active plan data yet.</p>
            ) : dashboard.planBreakdown.map(item => (
              <div key={item.label} className="admin-breakdown-row">
                <div>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
                <div className="admin-progress-track">
                  <span style={{ width: `${(item.value / maxPlanCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="admin-dashboard-grid admin-dashboard-grid-wide">
        <section className="glass-card admin-dashboard-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Recent Users</h2>
              <p>Newest accounts in the platform</p>
            </div>
            <Clock size={18} />
          </div>
          <div className="admin-activity-list">
            {dashboard.recentUsers.length === 0 ? (
              <p className="admin-empty-text">No users found yet.</p>
            ) : dashboard.recentUsers.map(item => (
              <button key={item.user_id} type="button" onClick={() => onNavigate('users')} className="admin-activity-row">
                <span>
                  <strong>{item.display_name || item.email || 'Unnamed user'}</strong>
                  <small>{item.email || 'No email'}</small>
                </span>
                <em>{formatDashboardDate(item.created_at)}</em>
              </button>
            ))}
          </div>
        </section>

        <section className="glass-card admin-dashboard-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Pantry Alerts</h2>
              <p>{dashboard.pantryTotal} pantry items tracked</p>
            </div>
            <AlertTriangle size={18} />
          </div>
          <div className="admin-activity-list">
            {dashboard.lowPantry.length === 0 ? (
              <p className="admin-empty-text">No low pantry items.</p>
            ) : dashboard.lowPantry.map(item => (
              <button key={item.id} type="button" onClick={() => onNavigate('pantry')} className="admin-activity-row">
                <span>
                  <strong>{item.ingredients?.canonical_name || 'Pantry item'}</strong>
                  <small>{item.ingredients?.category || 'Uncategorized'}</small>
                </span>
                <em>{item.quantity} {item.unit}</em>
              </button>
            ))}
          </div>
        </section>

        <section className="glass-card admin-dashboard-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Quick Actions</h2>
              <p>Common admin tasks</p>
            </div>
            <Plus size={18} />
          </div>
          <div className="admin-quick-actions">
            <button type="button" onClick={() => onNavigate('users')}><Users size={16} /> Review Users</button>
            <button type="button" onClick={() => onAction('plans', 'create')}><CreditCard size={16} /> Create Plan</button>
            <button type="button" onClick={() => onAction('pantry', 'create')}><Package size={16} /> Add Pantry Item</button>
            <button type="button" onClick={() => onAction('recipes', 'create')}><ChefHat size={16} /> Add Recipe</button>
          </div>
        </section>
      </div>

      <section className="glass-card admin-dashboard-panel admin-dashboard-recipe-strip">
        <div className="admin-panel-heading">
          <div>
            <h2>Recent Recipes</h2>
            <p>Recipe creation activity in the selected window</p>
          </div>
          <ChefHat size={18} />
        </div>
        <div className="admin-recipe-strip-content">
          <div className="admin-mini-chart">
            {dashboard.recipeSeries.map(point => (
              <span key={point.label} style={{ height: `${Math.max((point.value / maxRecipeSeries) * 100, point.value ? 16 : 4)}%` }} title={`${point.value} recipes on ${point.label}`} />
            ))}
          </div>
          <div className="admin-activity-list">
            {dashboard.recentRecipes.length === 0 ? (
              <p className="admin-empty-text">No recipes found yet.</p>
            ) : dashboard.recentRecipes.map(item => (
              <button key={item.id} type="button" onClick={() => onNavigate('recipes')} className="admin-activity-row">
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.ingredients?.length || 0} ingredients, {item.instructions?.length || 0} steps</small>
                </span>
                <em>{formatDashboardDate(item.created_at)}</em>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Users Tab ─────────────────────────────────────────────────── */

function UsersTab({ users, setUsers, plans, currentUserId, formatDate, badgeStyle, panelStyle, thStyle, tdStyle, showConfirm, showFeedback }) {
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [editSubStatus, setEditSubStatus] = useState('');
  const [editPlanId, setEditPlanId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [syncing, setSyncing] = useState(false);

  const actionBtn = { background: 'none', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border-color)', borderRadius: '8px', padding: '0.35rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
  const selectStyle = { padding: '0.3rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.85rem' };
  const inputStyle = { width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' };
  const labelStyle = { fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' };

  const startEdit = (u) => {
    setEditingId(u.user_id);
    setEditRole(u.role);
    setEditSubStatus(u.subscription_status || '');
    setEditPlanId(u.plan_id || '');
    setSaveError('');
  };
  const cancelEdit = () => { setEditingId(null); setEditRole(''); setEditSubStatus(''); setEditPlanId(''); setSaveError(''); };

  const saveUser = async () => {
    setSaveError('');
    setSaving(true);
    const user = users.find(u => u.user_id === editingId);
    if (!user) {
      setSaveError('User record not found.');
      setSaving(false);
      return;
    }

    if ((editSubStatus === 'active' || editSubStatus === 'trialing') && !editPlanId) {
      setSaveError('Please select a plan for active or trialing subscriptions.');
      setSaving(false);
      return;
    }

    // Update role if changed
    if (editRole !== user.role) {
      const { error } = await updateUserRole(editingId, editRole);
      if (error) {
        const message = error.message || 'Failed to update user role.';
        setSaveError(message);
        showFeedback({ title: 'User update failed', message, variant: 'error' });
        setSaving(false);
        return;
      }
    }

    // Update subscription if changed
    const subChanged = editSubStatus !== (user.subscription_status || '') || editPlanId !== (user.plan_id || '');
    if (subChanged) {
      const { error } = await updateUserSubscription(editingId, editPlanId || null, editSubStatus || null);
      if (error) {
        const message = error.message || 'Failed to update user subscription.';
        setSaveError(message);
        showFeedback({ title: 'User update failed', message, variant: 'error' });
        setSaving(false);
        return;
      }
    }

    // Update local state
    const selectedPlan = plans.find(p => p.id === (editPlanId || user.plan_id));
    const nextStatus = subChanged ? (editSubStatus || null) : (user.subscription_status || null);
    const nextPlanId = subChanged ? (editPlanId || null) : (user.plan_id || null);
    const nextPlanName = nextPlanId ? (selectedPlan?.display_name || user.plan_name || null) : null;

    setUsers(prev => prev.map(u => u.user_id === editingId ? {
      ...u,
      role: editRole,
      subscription_status: nextStatus,
      plan_name: nextPlanName,
      plan_id: nextPlanId,
    } : u));

    setSaving(false);
    cancelEdit();
    showFeedback({
      title: 'User updated',
      message: 'The user role and subscription settings were saved.',
      variant: 'success',
    });
  };

  const handleDelete = (u) => {
    showConfirm('Delete User', `Delete "${u.email}" from the app database and Supabase Auth? This cannot be undone.`, async () => {
      const { error } = await deleteUserProfile(u.user_id);
      if (error) throw new Error(error.message || 'Failed to delete user.');
      setUsers(prev => prev.filter(x => x.user_id !== u.user_id));
    }, 'danger', `"${u.email}" was deleted from the database and Auth.`);
  };

  const handlePruneMismatches = () => {
    showConfirm('Clean Auth Mismatches', 'Remove Auth users without an app profile, and profile rows without an Auth user?', async () => {
      setSyncing(true);
      const { data, error } = await pruneAuthUserMismatches();
      if (error) {
        setSyncing(false);
        throw new Error(error.message || 'Failed to clean Auth mismatches.');
      }
      const refreshedUsers = await fetchAllUsers();
      setUsers(refreshedUsers);
      setSyncing(false);
      const deletedAuth = data?.deleted_auth_users_without_profile || 0;
      const deletedProfiles = data?.deleted_profiles_without_auth || 0;
      showFeedback({
        title: 'Auth cleaned',
        message: `Removed ${deletedAuth} Auth user${deletedAuth === 1 ? '' : 's'} and ${deletedProfiles} profile row${deletedProfiles === 1 ? '' : 's'} that did not match.`,
        variant: 'success',
      });
    }, 'danger', null);
  };

  return (
    <>
    <div className="admin-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
      <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '700' }}>Users</h3>
      <button type="button" className="btn-secondary" onClick={handlePruneMismatches} disabled={syncing} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
        <RefreshCw size={16} /> {syncing ? 'Cleaning...' : 'Clean Auth Mismatches'}
      </button>
    </div>
    <div className="admin-table-panel" style={panelStyle}>
      <div className="admin-table-scroll" style={{ overflowX: 'auto' }}>
        <table className="admin-data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Subscription</th>
              <th style={thStyle}>Joined</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td className="admin-empty-cell" colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>No users found</td></tr>
            ) : users.map(u => {
              const isEditing = false;
              return (
                <tr key={u.user_id}>
                  <td data-label="Email" className="admin-primary-cell" style={tdStyle}>{u.email}</td>
                  <td data-label="Name" style={tdStyle}>{u.display_name || '—'}</td>
                  <td data-label="Role" style={tdStyle}>
                    <span style={badgeStyle(u.role === 'admin' ? '#7a5ed3' : '#6b7280')}>{u.role}</span>
                  </td>
                  <td data-label="Subscription" style={tdStyle}>
                    {isEditing ? (
                      <div className="admin-inline-fields" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <select value={editPlanId} onChange={e => setEditPlanId(e.target.value)} style={selectStyle}>
                          <option value="">No Plan</option>
                          {plans.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                        </select>
                        <select value={editSubStatus} onChange={e => setEditSubStatus(e.target.value)} style={selectStyle}>
                          <option value="">None</option>
                          <option value="active">active</option>
                          <option value="trialing">trialing</option>
                          <option value="canceled">canceled</option>
                          <option value="expired">expired</option>
                        </select>
                      </div>
                    ) : (
                      u.subscription_status
                        ? <span style={badgeStyle(u.subscription_status === 'active' ? '#10b981' : '#f59e0b')}>{u.subscription_status}{u.plan_name ? ` · ${u.plan_name}` : ''}</span>
                        : <span style={badgeStyle('#6b7280')}>None</span>
                    )}
                  </td>
                  <td data-label="Joined" style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{formatDate(u.created_at)}</td>
                  <td data-label="Actions" className="admin-actions-cell" style={tdStyle}>
                    {isEditing ? (
                      <div className="admin-action-row" style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="admin-action-button" onClick={saveUser} disabled={saving} style={{ ...actionBtn, color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }} title={`Save ${u.email}`} aria-label={`Save ${u.email}`}><Check size={16} /></button>
                        <button className="admin-action-button" onClick={cancelEdit} style={{ ...actionBtn, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }} title={`Cancel editing ${u.email}`} aria-label={`Cancel editing ${u.email}`}><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="admin-action-row" style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="admin-action-button" onClick={() => startEdit(u)} style={actionBtn} title={`Edit ${u.email}`} aria-label={`Edit ${u.email}`}><Pencil size={16} /></button>
                        <button className="admin-action-button" onClick={() => handleDelete(u)} disabled={u.user_id === currentUserId} style={{ ...actionBtn, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', opacity: u.user_id === currentUserId ? 0.45 : 1, cursor: u.user_id === currentUserId ? 'not-allowed' : 'pointer' }} title={u.user_id === currentUserId ? 'You cannot delete your own admin account here' : `Delete ${u.email}`} aria-label={u.user_id === currentUserId ? 'You cannot delete your own admin account here' : `Delete ${u.email}`}><Trash2 size={16} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    <AdminFormModal open={!!editingId} title="Edit User" onClose={cancelEdit} onSubmit={saveUser} submitText="Update" loading={saving}>
      {saveError && (
        <div style={{ padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600 }}>
          {saveError}
        </div>
      )}
      <div>
        <label style={labelStyle}>Email</label>
        <input style={{ ...inputStyle, opacity: 0.72 }} value={users.find(u => u.user_id === editingId)?.email || ''} disabled />
      </div>
      <div className="admin-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>Role</label>
          <select value={editRole} onChange={e => setEditRole(e.target.value)} style={inputStyle}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Subscription Status</label>
          <select value={editSubStatus} onChange={e => setEditSubStatus(e.target.value)} style={inputStyle}>
            <option value="">None</option>
            <option value="active">active</option>
            <option value="trialing">trialing</option>
            <option value="canceled">canceled</option>
            <option value="expired">expired</option>
          </select>
        </div>
      </div>
      <div>
        <label style={labelStyle}>Plan</label>
        <select value={editPlanId} onChange={e => setEditPlanId(e.target.value)} style={inputStyle}>
          <option value="">No Plan</option>
          {plans.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
        </select>
      </div>
    </AdminFormModal>
    </>
  );
}

/* ─── Plans Tab ─────────────────────────────────────────────────── */

function PlansTab({ plans, setPlans, onToggle, badgeStyle, panelStyle, thStyle, tdStyle, showConfirm, showFeedback, pendingAction }) {
  const defaultPlanForm = { display_name: '', plan_code: '', price: '', currency: 'PHP', billing_period_days: 30, is_active: true };
  const [showForm, setShowForm] = useState(pendingAction?.action === 'create');
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState(defaultPlanForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const actionBtn = { background: 'none', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border-color)', borderRadius: '8px', padding: '0.35rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

  const inputStyle = { width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' };
  const labelStyle = { fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' };

  const openCreate = () => {
    setEditingPlan(null);
    setFormData(defaultPlanForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({ display_name: plan.display_name, plan_code: plan.plan_code, price: (plan.price_cents / 100).toFixed(2), currency: plan.currency || 'PHP', billing_period_days: plan.billing_period_days, is_active: plan.is_active });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingPlan(null); setFormError(''); };

  const handleSubmit = async () => {
    setFormError('');
    setFormLoading(true);
    const payload = {
      display_name: formData.display_name,
      plan_code: formData.plan_code,
      price_cents: Math.round(parseFloat(formData.price) * 100),
      currency: (formData.currency || 'PHP').toUpperCase(),
      billing_period_days: parseInt(formData.billing_period_days, 10),
      is_active: formData.is_active,
    };

    if (editingPlan) {
      const { data, error } = await updatePlan(editingPlan.id, payload);
      if (error) {
        const message = error.message || 'Failed to update plan.';
        setFormError(message);
        showFeedback({ title: 'Plan update failed', message, variant: 'error' });
        setFormLoading(false);
        return;
      }
      if (data) setPlans(prev => prev.map(p => p.id === editingPlan.id ? data : p));
      showFeedback({
        title: 'Plan updated',
        message: `"${payload.display_name}" was saved successfully.`,
        variant: 'success',
      });
    } else {
      const { data, error } = await createPlan(payload);
      if (error) {
        const message = error.message || 'Failed to create plan.';
        setFormError(message);
        showFeedback({ title: 'Plan creation failed', message, variant: 'error' });
        setFormLoading(false);
        return;
      }
      if (data) setPlans(prev => [...prev, data]);
      showFeedback({
        title: 'Plan created',
        message: `"${payload.display_name}" was added to subscription plans.`,
        variant: 'success',
      });
    }
    setFormLoading(false);
    closeForm();
  };

  const handleDelete = (plan) => {
    showConfirm('Delete Plan', `Delete the plan "${plan.display_name}"? Users on this plan will not be affected.`, async () => {
      const { error } = await deletePlan(plan.id);
      if (error) throw new Error(error.message || 'Failed to delete plan.');
      setPlans(prev => prev.filter(p => p.id !== plan.id));
    }, 'danger', `"${plan.display_name}" was deleted.`);
  };

  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  return (
    <>
      <div className="admin-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '700' }}>Subscription Plans</h3>
        <button className="btn-primary admin-add-button" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}>
          <Plus size={16} /> Add Plan
        </button>
      </div>

      <div className="admin-table-panel" style={panelStyle}>
        <div className="admin-table-scroll" style={{ overflowX: 'auto' }}>
          <table className="admin-data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Plan Name</th>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Price</th>
                <th style={thStyle}>Period</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr><td className="admin-empty-cell" colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>No plans found</td></tr>
              ) : plans.map(p => (
                <tr key={p.id}>
                  <td data-label="Plan Name" className="admin-primary-cell" style={{ ...tdStyle, fontWeight: '600' }}>{p.display_name}</td>
                  <td data-label="Code" style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{p.plan_code}</td>
                  <td data-label="Price" style={tdStyle}>{formatPlanPrice(p)}</td>
                  <td data-label="Period" style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{p.billing_period_days} days</td>
                  <td data-label="Status" style={tdStyle}>
                    <span style={badgeStyle(p.is_active ? '#10b981' : '#ef4444')}>{p.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td data-label="Actions" className="admin-actions-cell" style={tdStyle}>
                    <div className="admin-action-row" style={{ display: 'flex', gap: '0.35rem' }}>
                      <button className="admin-action-button" onClick={() => onToggle(p.id, p.is_active)} style={{ ...actionBtn, color: p.is_active ? '#10b981' : '#6b7280' }} title={`${p.is_active ? 'Deactivate' : 'Activate'} ${p.display_name}`} aria-label={`${p.is_active ? 'Deactivate' : 'Activate'} ${p.display_name}`}>
                        {p.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      <button className="admin-action-button" onClick={() => openEdit(p)} style={actionBtn} title={`Edit ${p.display_name}`} aria-label={`Edit ${p.display_name}`}><Pencil size={16} /></button>
                      <button className="admin-action-button" onClick={() => handleDelete(p)} style={{ ...actionBtn, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }} title={`Delete ${p.display_name}`} aria-label={`Delete ${p.display_name}`}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AdminFormModal open={showForm} title={editingPlan ? 'Edit Plan' : 'Create Plan'} onClose={closeForm} onSubmit={handleSubmit} submitText={editingPlan ? 'Update' : 'Create'} loading={formLoading}>
        {formError && (
          <div style={{ padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600 }}>
            {formError}
          </div>
        )}
        <div>
          <label style={labelStyle}>Plan Name</label>
          <input style={inputStyle} value={formData.display_name} onChange={e => set('display_name', e.target.value)} placeholder="e.g. Monthly Pro" required />
        </div>
        <div>
          <label style={labelStyle}>Plan Code</label>
          <input style={inputStyle} value={formData.plan_code} onChange={e => set('plan_code', e.target.value)} placeholder="e.g. monthly_pro" required />
        </div>
        <div className="admin-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Price ({formData.currency || 'PHP'})</label>
            <input style={inputStyle} type="number" step="0.01" min="0" value={formData.price} onChange={e => set('price', e.target.value)} placeholder="9.99" required />
          </div>
          <div>
            <label style={labelStyle}>Currency</label>
            <select style={inputStyle} value={formData.currency} onChange={e => set('currency', e.target.value)} required>
              <option value="PHP">PHP</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Period (days)</label>
            <input style={inputStyle} type="number" min="1" value={formData.billing_period_days} onChange={e => set('billing_period_days', e.target.value)} required />
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
          <input type="checkbox" checked={formData.is_active} onChange={e => set('is_active', e.target.checked)} />
          Active
        </label>
      </AdminFormModal>
    </>
  );
}

/* ─── Pantry Tab ────────────────────────────────────────────────── */

function PantryTab({ items, setItems, households, userId, formatDate, panelStyle, thStyle, tdStyle, showConfirm, showFeedback, pendingAction }) {
  const actionBtn = { background: 'none', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border-color)', borderRadius: '8px', padding: '0.35rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
  const inputStyle = { width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' };
  const labelStyle = { fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' };
  const adminHouseholdId = households.find(h => h.user_id === userId)?.household_id || '';
  const householdOptions = useMemo(() => (
    adminHouseholdId
      ? [...households].sort((a, b) => Number(b.household_id === adminHouseholdId) - Number(a.household_id === adminHouseholdId))
      : households
  ), [adminHouseholdId, households]);
  const defaultPantryForm = { ingredientName: '', quantity: 1, unit: 'pcs', category: CATEGORIES[0], expiresAt: '', householdId: adminHouseholdId || householdOptions[0]?.household_id || '' };
  const [showForm, setShowForm] = useState(pendingAction?.action === 'create');
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(defaultPantryForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const openCreate = () => {
    setEditingItem(null);
    setFormData(defaultPantryForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({ ingredientName: item.ingredients?.canonical_name || '', quantity: item.quantity, unit: item.unit, category: item.ingredients?.category || CATEGORIES[0], expiresAt: item.expires_at ? item.expires_at.split('T')[0] : '' , householdId: '' });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingItem(null); setFormError(''); };

  const handleSubmit = async () => {
    setFormError('');
    setFormLoading(true);
    if (editingItem) {
      const { data, error } = await updatePantryItem(editingItem.id, {
        ingredientName: formData.ingredientName,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        category: formData.category,
        expires_at: formData.expiresAt || null,
      });
      if (error) {
        const message = error.message || 'Failed to update pantry item.';
        setFormError(message);
        showFeedback({ title: 'Pantry update failed', message, variant: 'error' });
        setFormLoading(false);
        return;
      }
      if (data) setItems(prev => prev.map(i => i.id === editingItem.id ? data : i));
      showFeedback({
        title: 'Pantry item updated',
        message: `"${formData.ingredientName}" was saved successfully.`,
        variant: 'success',
      });
    } else {
      if (!formData.householdId) {
        setFormError('Please select a household before adding an item.');
        setFormLoading(false);
        return;
      }
      const { data, error } = await adminCreatePantryItem({
        ingredientName: formData.ingredientName,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        category: formData.category,
        expiresAt: formData.expiresAt || null,
        householdId: formData.householdId,
        userId,
      });
      if (error) {
        const message = error.message || 'Failed to add pantry item.';
        setFormError(message);
        showFeedback({ title: 'Pantry item creation failed', message, variant: 'error' });
        setFormLoading(false);
        return;
      }
      if (data) setItems(prev => [data, ...prev]);
      showFeedback({
        title: 'Pantry item added',
        message: `"${formData.ingredientName}" was added to the selected household.`,
        variant: 'success',
      });
    }
    setFormLoading(false);
    closeForm();
  };

  const handleDelete = (item) => {
    const name = item.ingredients?.canonical_name || 'this item';
    showConfirm('Remove Pantry Item', `Remove "${name}" from the pantry?`, async () => {
      const { error } = await deletePantryItem(item.id);
      if (error) throw new Error(error.message || 'Failed to remove pantry item.');
      setItems(prev => prev.filter(i => i.id !== item.id));
    }, 'danger', `"${name}" was removed from the pantry.`);
  };

  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  return (
    <>
      <div className="admin-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '700' }}>Pantry Items</h3>
        <button className="btn-primary admin-add-button" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}>
          <Plus size={16} /> Add Item
        </button>
      </div>

      <div className="admin-table-panel" style={panelStyle}>
        <div className="admin-table-scroll" style={{ overflowX: 'auto' }}>
          <table className="admin-data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Ingredient</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Quantity</th>
                <th style={thStyle}>Expires</th>
                <th style={thStyle}>Added</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td className="admin-empty-cell" colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>No pantry items found</td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td data-label="Ingredient" className="admin-primary-cell" style={{ ...tdStyle, fontWeight: '600' }}>{item.ingredients?.canonical_name || '—'}</td>
                  <td data-label="Category" style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{item.ingredients?.category || '—'}</td>
                  <td data-label="Quantity" style={tdStyle}>{item.quantity} {item.unit}</td>
                  <td data-label="Expires" style={{ ...tdStyle, color: item.expires_at && new Date(item.expires_at) < new Date() ? '#ef4444' : 'var(--text-secondary)' }}>
                    {formatDate(item.expires_at)}
                  </td>
                  <td data-label="Added" style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{formatDate(item.created_at)}</td>
                  <td data-label="Actions" className="admin-actions-cell" style={tdStyle}>
                    <div className="admin-action-row" style={{ display: 'flex', gap: '0.35rem' }}>
                      <button className="admin-action-button" onClick={() => openEdit(item)} style={actionBtn} title={`Edit ${item.ingredients?.canonical_name || 'pantry item'}`} aria-label={`Edit ${item.ingredients?.canonical_name || 'pantry item'}`}><Pencil size={16} /></button>
                      <button className="admin-action-button" onClick={() => handleDelete(item)} style={{ ...actionBtn, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }} title={`Delete ${item.ingredients?.canonical_name || 'pantry item'}`} aria-label={`Delete ${item.ingredients?.canonical_name || 'pantry item'}`}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AdminFormModal open={showForm} title={editingItem ? 'Edit Pantry Item' : 'Add Pantry Item'} onClose={closeForm} onSubmit={handleSubmit} submitText={editingItem ? 'Update' : 'Add'} loading={formLoading}>
        {formError && (
          <div style={{ padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600 }}>
            {formError}
          </div>
        )}
        <div>
          <label style={labelStyle}>Ingredient Name</label>
          <input style={inputStyle} value={formData.ingredientName} onChange={e => set('ingredientName', e.target.value)} placeholder="e.g. Chicken Breast" required />
        </div>
        {!editingItem && households.length > 0 && (
          <div>
            <label style={labelStyle}>Household</label>
            <select style={inputStyle} value={formData.householdId} onChange={e => set('householdId', e.target.value)} required>
              {householdOptions.map(h => (
                <option key={h.household_id} value={h.household_id}>{h.household_id}</option>
              ))}
            </select>
          </div>
        )}
        <div className="admin-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Quantity</label>
            <input style={inputStyle} type="number" min="0" step="0.1" value={formData.quantity} onChange={e => set('quantity', e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>Unit</label>
            <select style={inputStyle} value={formData.unit} onChange={e => set('unit', e.target.value)}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Category</label>
          <select style={inputStyle} value={formData.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Expiration Date</label>
          <input style={inputStyle} type="date" value={formData.expiresAt} onChange={e => set('expiresAt', e.target.value)} />
        </div>
      </AdminFormModal>
    </>
  );
}

/* ─── Recipes Tab ───────────────────────────────────────────────── */

function RecipesTab({ recipes, setRecipes, userId, formatDate, panelStyle, thStyle, tdStyle, showConfirm, showFeedback, pendingAction }) {
  const defaultRecipeForm = { title: '', ingredients: [''], instructions: [''] };
  const [showForm, setShowForm] = useState(pendingAction?.action === 'create');
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [formData, setFormData] = useState(defaultRecipeForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const actionBtn = { background: 'none', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border-color)', borderRadius: '8px', padding: '0.35rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
  const inputStyle = { width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' };
  const labelStyle = { fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' };

  const openCreate = () => {
    setEditingRecipe(null);
    setFormData(defaultRecipeForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (recipe) => {
    setEditingRecipe(recipe);
    setFormData({
      title: recipe.title || '',
      ingredients: recipe.ingredients?.length ? [...recipe.ingredients] : [''],
      instructions: recipe.instructions?.length ? [...recipe.instructions] : [''],
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRecipe(null);
    setFormError('');
  };

  const updateList = (key, index, value) => {
    setFormData(prev => {
      const next = [...prev[key]];
      next[index] = value;
      return { ...prev, [key]: next };
    });
  };

  const addListItem = (key) => setFormData(prev => ({ ...prev, [key]: [...prev[key], ''] }));
  const removeListItem = (key, index) => setFormData(prev => ({ ...prev, [key]: prev[key].filter((_, itemIndex) => itemIndex !== index) }));

  const handleSubmit = async () => {
    const title = formData.title.trim();
    if (!title) {
      setFormError('Recipe title cannot be empty.');
      return;
    }
    if (!editingRecipe && !userId) {
      setFormError('Admin user session is required to create a recipe.');
      return;
    }

    const payload = {
      title,
      ingredientLines: formData.ingredients.map(item => item.trim()).filter(Boolean),
      instructions: formData.instructions.map(item => item.trim()).filter(Boolean),
    };

    setFormError('');
    setFormLoading(true);
    const { data, error } = editingRecipe
      ? await adminUpdateRecipe(editingRecipe.id, payload)
      : await adminCreateRecipe({ userId, ...payload });

    if (error) {
      const message = error.message || 'Failed to save recipe.';
      setFormError(message);
      showFeedback({ title: 'Recipe save failed', message, variant: 'error' });
      setFormLoading(false);
      return;
    }

    if (data) {
      setRecipes(prev => editingRecipe
        ? prev.map(recipe => recipe.id === editingRecipe.id ? data : recipe)
        : [data, ...prev]);
    }
    showFeedback({
      title: editingRecipe ? 'Recipe updated' : 'Recipe added',
      message: `"${title}" was saved successfully.`,
      variant: 'success',
    });

    setFormLoading(false);
    closeForm();
  };

  const handleDelete = (recipe) => {
    showConfirm('Delete Recipe', `Delete "${recipe.title}"? This will also remove it from all users' cookbooks.`, async () => {
      const { error } = await deleteRecipe(recipe.id);
      if (error) throw new Error(error.message || 'Failed to delete recipe.');
      setRecipes(prev => prev.filter(r => r.id !== recipe.id));
    }, 'danger', `"${recipe.title}" was deleted.`);
  };

  return (
    <>
      <div className="admin-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '700' }}>Recipes</h3>
        <button className="btn-primary admin-add-button" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}>
          <Plus size={16} /> Add Recipe
        </button>
      </div>

      <div className="admin-table-panel" style={panelStyle}>
        <div className="admin-table-scroll" style={{ overflowX: 'auto' }}>
          <table className="admin-data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Details</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recipes.length === 0 ? (
                <tr><td className="admin-empty-cell" colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>No recipes found</td></tr>
              ) : recipes.map(r => (
                <tr key={r.id}>
                  <td data-label="Title" className="admin-primary-cell" style={{ ...tdStyle, fontWeight: '600' }}>{r.title}</td>
                  <td data-label="Details" style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
                    {(r.ingredients?.length || 0)} ingredients / {(r.instructions?.length || 0)} steps
                  </td>
                  <td data-label="Created" style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{formatDate(r.created_at)}</td>
                  <td data-label="Actions" className="admin-actions-cell" style={tdStyle}>
                    <div className="admin-action-row" style={{ display: 'flex', gap: '0.35rem' }}>
                      <button className="admin-action-button" onClick={() => openEdit(r)} style={actionBtn} title={`Edit ${r.title}`} aria-label={`Edit ${r.title}`}><Pencil size={16} /></button>
                      <button className="admin-action-button" onClick={() => handleDelete(r)} style={{ ...actionBtn, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }} title={`Delete ${r.title}`} aria-label={`Delete ${r.title}`}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AdminFormModal open={showForm} title={editingRecipe ? 'Edit Recipe' : 'Add Recipe'} onClose={closeForm} onSubmit={handleSubmit} submitText={editingRecipe ? 'Update' : 'Add'} loading={formLoading} maxWidth="760px">
        {formError && (
          <div style={{ padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600 }}>
            {formError}
          </div>
        )}
        <div>
          <label style={labelStyle}>Recipe Title</label>
          <input style={inputStyle} value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. Vegetable Fried Rice" required />
        </div>
        <div className="admin-modal-list-section">
          <div className="admin-modal-list-heading">
            <label style={labelStyle}>Ingredients</label>
            <button type="button" className="btn-secondary" onClick={() => addListItem('ingredients')}><Plus size={14} /> Add</button>
          </div>
          {formData.ingredients.map((ingredient, index) => (
            <div className="admin-modal-list-row" key={`ingredient-${index}`}>
              <input style={inputStyle} value={ingredient} onChange={e => updateList('ingredients', index, e.target.value)} placeholder="e.g. 2 cups rice" />
              <button type="button" className="admin-action-button" onClick={() => removeListItem('ingredients', index)} title="Remove ingredient" aria-label="Remove ingredient" disabled={formData.ingredients.length === 1 && !ingredient}>
                <Minus size={15} />
              </button>
            </div>
          ))}
        </div>
        <div className="admin-modal-list-section">
          <div className="admin-modal-list-heading">
            <label style={labelStyle}>Instructions</label>
            <button type="button" className="btn-secondary" onClick={() => addListItem('instructions')}><Plus size={14} /> Add</button>
          </div>
          {formData.instructions.map((instruction, index) => (
            <div className="admin-modal-list-row admin-modal-list-row-top" key={`instruction-${index}`}>
              <span className="admin-step-number">{index + 1}</span>
              <textarea style={{ ...inputStyle, minHeight: '76px', resize: 'vertical' }} value={instruction} onChange={e => updateList('instructions', index, e.target.value)} placeholder={`Step ${index + 1}`} />
              <button type="button" className="admin-action-button" onClick={() => removeListItem('instructions', index)} title="Remove instruction" aria-label="Remove instruction" disabled={formData.instructions.length === 1 && !instruction}>
                <Minus size={15} />
              </button>
            </div>
          ))}
        </div>
      </AdminFormModal>
    </>
  );
}
