import { useCallback, useState, useEffect, useContext } from 'react';
import { Shield, Users, CreditCard, Package, ChefHat, BarChart3, ToggleLeft, ToggleRight, LogOut, Moon, Sun, Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import {
  fetchAllUsers, fetchAdminStats, fetchAllPlans, togglePlanActive,
  fetchAllPantryItems, fetchAllRecipes, fetchAllHouseholds,
  updateUserRole, deleteUserProfile, updateUserSubscription,
  createPlan, updatePlan, deletePlan,
  adminCreatePantryItem, updatePantryItem, deletePantryItem,
  updateRecipeTitle, deleteRecipe,
} from '../../services/admin';
import { formatPlanPrice } from '../../services/subscription';
import { AppContext } from '../../AppContextValue';
import BrandIcon from '../../components/BrandIcon';
import ConfirmModal from '../../components/ConfirmModal';
import AdminFormModal from '../../components/AdminFormModal';
import LoadingAlert from '../../components/LoadingAlert';
import { CATEGORIES, UNITS } from '../../constants/categories';
import { formatModelProvider } from '../../utils/formatters';

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
    if (!error) setPlans(prev => prev.map(p => p.id === planId ? { ...p, is_active: !currentActive } : p));
  };

  const showConfirm = (title, message, onConfirm, variant = 'danger') => {
    setConfirmModal({ title, message, onConfirm, variant });
  };
  const closeConfirm = () => setConfirmModal(null);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const panelStyle = { background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' };
  const thStyle = { padding: '0.85rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', background: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)' };
  const tdStyle = { padding: '0.85rem 1.25rem', fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' };
  const badgeStyle = (color) => ({ padding: '0.15rem 0.55rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', background: `${color}18`, color });

  if (loading) {
    return <LoadingAlert title="Loading admin dashboard" message="Fetching users, plans, pantry items, and recipes." />;
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
        <nav className="admin-sidebar-nav">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`admin-sidebar-link${activeTab === tab.key ? ' active' : ''}`}>
                <Icon size={18} /><span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="admin-sidebar-footer">
          <button onClick={toggleTheme} className="admin-sidebar-link">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button onClick={signOut} className="admin-sidebar-link admin-sidebar-logout">
            <LogOut size={18} /><span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        {activeTab === 'stats' && <StatsTab stats={stats} />}
        {activeTab === 'users' && <UsersTab users={users} setUsers={setUsers} plans={plans} formatDate={formatDate} badgeStyle={badgeStyle} panelStyle={panelStyle} thStyle={thStyle} tdStyle={tdStyle} showConfirm={showConfirm} />}
        {activeTab === 'plans' && <PlansTab plans={plans} setPlans={setPlans} onToggle={handleTogglePlan} badgeStyle={badgeStyle} panelStyle={panelStyle} thStyle={thStyle} tdStyle={tdStyle} showConfirm={showConfirm} />}
        {activeTab === 'pantry' && <PantryTab items={pantryItems} setItems={setPantryItems} households={households} userId={user?.id} formatDate={formatDate} panelStyle={panelStyle} thStyle={thStyle} tdStyle={tdStyle} showConfirm={showConfirm} />}
        {activeTab === 'recipes' && <RecipesTab recipes={recipes} setRecipes={setRecipes} formatDate={formatDate} panelStyle={panelStyle} thStyle={thStyle} tdStyle={tdStyle} showConfirm={showConfirm} />}
      </main>

      <ConfirmModal
        open={!!confirmModal}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        confirmText={confirmModal?.confirmText || 'Delete'}
        variant={confirmModal?.variant || 'danger'}
        onConfirm={async () => { await confirmModal?.onConfirm?.(); closeConfirm(); }}
        onCancel={closeConfirm}
      />
    </div>
  );
}

/* ─── Stats Tab ─────────────────────────────────────────────────── */

function StatsTab({ stats }) {
  const cards = [
    { label: 'Total Users', value: stats?.total_users ?? 0, icon: Users, color: '#7a5ed3' },
    { label: 'Active Subscriptions', value: stats?.active_subscriptions ?? 0, icon: CreditCard, color: '#10b981' },
    { label: 'Pantry Items', value: stats?.total_pantry_items ?? 0, icon: Package, color: '#f59e0b' },
    { label: 'Total Recipes', value: stats?.total_recipes ?? 0, icon: ChefHat, color: '#ef4444' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${card.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={22} color={card.color} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>{card.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '600' }}>{card.label}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Users Tab ─────────────────────────────────────────────────── */

function UsersTab({ users, setUsers, plans, formatDate, badgeStyle, panelStyle, thStyle, tdStyle, showConfirm }) {
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [editSubStatus, setEditSubStatus] = useState('');
  const [editPlanId, setEditPlanId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const actionBtn = { background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.35rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
  const selectStyle = { padding: '0.3rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.85rem' };

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
        setSaveError(error.message || 'Failed to update user role.');
        setSaving(false);
        return;
      }
    }

    // Update subscription if changed
    const subChanged = editSubStatus !== (user.subscription_status || '') || editPlanId !== (user.plan_id || '');
    if (subChanged) {
      const { error } = await updateUserSubscription(editingId, editPlanId || null, editSubStatus || null);
      if (error) {
        setSaveError(error.message || 'Failed to update user subscription.');
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
  };

  const handleDelete = (u) => {
    showConfirm('Delete User', `Remove the profile for "${u.email}"? This will remove their profile data.`, async () => {
      const { error } = await deleteUserProfile(u.user_id);
      if (!error) setUsers(prev => prev.filter(x => x.user_id !== u.user_id));
    });
  };

  return (
    <div style={panelStyle}>
      {saveError && (
        <div style={{ margin: '0.75rem 1rem 0', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600 }}>
          {saveError}
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>No users found</td></tr>
            ) : users.map(u => {
              const isEditing = editingId === u.user_id;
              return (
                <tr key={u.user_id}>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>{u.display_name || '—'}</td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <select value={editRole} onChange={e => setEditRole(e.target.value)} style={selectStyle}>
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    ) : (
                      <span style={badgeStyle(u.role === 'admin' ? '#7a5ed3' : '#6b7280')}>{u.role}</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
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
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{formatDate(u.created_at)}</td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button onClick={saveUser} disabled={saving} style={{ ...actionBtn, color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}><Check size={16} /></button>
                        <button onClick={cancelEdit} style={{ ...actionBtn, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}><X size={16} /></button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button onClick={() => startEdit(u)} style={actionBtn}><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(u)} style={{ ...actionBtn, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}><Trash2 size={16} /></button>
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
  );
}

/* ─── Plans Tab ─────────────────────────────────────────────────── */

function PlansTab({ plans, setPlans, onToggle, badgeStyle, panelStyle, thStyle, tdStyle, showConfirm }) {
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({ display_name: '', plan_code: '', price: '', currency: 'PHP', billing_period_days: 30, is_active: true });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const actionBtn = { background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.35rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

  const inputStyle = { width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' };
  const labelStyle = { fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' };

  const openCreate = () => {
    setEditingPlan(null);
    setFormData({ display_name: '', plan_code: '', price: '', currency: 'PHP', billing_period_days: 30, is_active: true });
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
        setFormError(error.message || 'Failed to update plan.');
        setFormLoading(false);
        return;
      }
      if (data) setPlans(prev => prev.map(p => p.id === editingPlan.id ? data : p));
    } else {
      const { data, error } = await createPlan(payload);
      if (error) {
        setFormError(error.message || 'Failed to create plan.');
        setFormLoading(false);
        return;
      }
      if (data) setPlans(prev => [...prev, data]);
    }
    setFormLoading(false);
    closeForm();
  };

  const handleDelete = (plan) => {
    showConfirm('Delete Plan', `Delete the plan "${plan.display_name}"? Users on this plan will not be affected.`, async () => {
      const { error } = await deletePlan(plan.id);
      if (!error) setPlans(prev => prev.filter(p => p.id !== plan.id));
    });
  };

  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '700' }}>Subscription Plans</h3>
        <button className="btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}>
          <Plus size={16} /> Add Plan
        </button>
      </div>

      <div style={panelStyle}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>No plans found</td></tr>
              ) : plans.map(p => (
                <tr key={p.id}>
                  <td style={{ ...tdStyle, fontWeight: '600' }}>{p.display_name}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{p.plan_code}</td>
                  <td style={tdStyle}>{formatPlanPrice(p)}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{p.billing_period_days} days</td>
                  <td style={tdStyle}>
                    <span style={badgeStyle(p.is_active ? '#10b981' : '#ef4444')}>{p.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button onClick={() => onToggle(p.id, p.is_active)} style={{ ...actionBtn, color: p.is_active ? '#10b981' : '#6b7280' }}>
                        {p.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      <button onClick={() => openEdit(p)} style={actionBtn}><Pencil size={16} /></button>
                      <button onClick={() => handleDelete(p)} style={{ ...actionBtn, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}><Trash2 size={16} /></button>
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
          <input type="checkbox" checked={formData.is_active} onChange={e => set('is_active', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)' }} />
          Active
        </label>
      </AdminFormModal>
    </>
  );
}

/* ─── Pantry Tab ────────────────────────────────────────────────── */

function PantryTab({ items, setItems, households, userId, formatDate, panelStyle, thStyle, tdStyle, showConfirm }) {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ ingredientName: '', quantity: 1, unit: 'pcs', category: CATEGORIES[0], expiresAt: '', householdId: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const actionBtn = { background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.35rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
  const inputStyle = { width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' };
  const labelStyle = { fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' };

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ ingredientName: '', quantity: 1, unit: 'pcs', category: CATEGORIES[0], expiresAt: '', householdId: households[0]?.household_id || '' });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({ ingredientName: item.ingredients?.canonical_name || '', quantity: item.quantity, unit: item.unit, category: item.ingredients?.category || '', expiresAt: item.expires_at ? item.expires_at.split('T')[0] : '' , householdId: '' });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingItem(null); setFormError(''); };

  const handleSubmit = async () => {
    setFormError('');
    setFormLoading(true);
    if (editingItem) {
      const { data, error } = await updatePantryItem(editingItem.id, {
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        expires_at: formData.expiresAt || null,
      });
      if (error) {
        setFormError(error.message || 'Failed to update pantry item.');
        setFormLoading(false);
        return;
      }
      if (data) setItems(prev => prev.map(i => i.id === editingItem.id ? data : i));
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
        setFormError(error.message || 'Failed to add pantry item.');
        setFormLoading(false);
        return;
      }
      if (data) setItems(prev => [data, ...prev]);
    }
    setFormLoading(false);
    closeForm();
  };

  const handleDelete = (item) => {
    const name = item.ingredients?.canonical_name || 'this item';
    showConfirm('Remove Pantry Item', `Remove "${name}" from the pantry?`, async () => {
      const { error } = await deletePantryItem(item.id);
      if (!error) setItems(prev => prev.filter(i => i.id !== item.id));
    });
  };

  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '700' }}>Pantry Items</h3>
        <button className="btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}>
          <Plus size={16} /> Add Item
        </button>
      </div>

      <div style={panelStyle}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>No pantry items found</td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td style={{ ...tdStyle, fontWeight: '600' }}>{item.ingredients?.canonical_name || '—'}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{item.ingredients?.category || '—'}</td>
                  <td style={tdStyle}>{item.quantity} {item.unit}</td>
                  <td style={{ ...tdStyle, color: item.expires_at && new Date(item.expires_at) < new Date() ? '#ef4444' : 'var(--text-secondary)' }}>
                    {formatDate(item.expires_at)}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{formatDate(item.created_at)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button onClick={() => openEdit(item)} style={actionBtn}><Pencil size={16} /></button>
                      <button onClick={() => handleDelete(item)} style={{ ...actionBtn, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}><Trash2 size={16} /></button>
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
        {!editingItem && (
          <div>
            <label style={labelStyle}>Ingredient Name</label>
            <input style={inputStyle} value={formData.ingredientName} onChange={e => set('ingredientName', e.target.value)} placeholder="e.g. Chicken Breast" required />
          </div>
        )}
        {!editingItem && households.length > 0 && (
          <div>
            <label style={labelStyle}>Household</label>
            <select style={inputStyle} value={formData.householdId} onChange={e => set('householdId', e.target.value)} required>
              {households.map(h => (
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
        {!editingItem && (
          <div>
            <label style={labelStyle}>Category</label>
            <select style={inputStyle} value={formData.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        <div>
          <label style={labelStyle}>Expiration Date</label>
          <input style={inputStyle} type="date" value={formData.expiresAt} onChange={e => set('expiresAt', e.target.value)} />
        </div>
      </AdminFormModal>
    </>
  );
}

/* ─── Recipes Tab ───────────────────────────────────────────────── */

function RecipesTab({ recipes, setRecipes, formatDate, panelStyle, thStyle, tdStyle, showConfirm }) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const actionBtn = { background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.35rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

  const startEdit = (r) => { setEditingId(r.id); setEditTitle(r.title); setSaveError(''); };
  const cancelEdit = () => { setEditingId(null); setEditTitle(''); setSaveError(''); };

  const saveTitle = async () => {
    const title = editTitle.trim();
    if (!title) {
      setSaveError('Recipe title cannot be empty.');
      return;
    }

    setSaveError('');
    setSaving(true);
    const { data, error } = await updateRecipeTitle(editingId, title);
    if (error) {
      setSaveError(error.message || 'Failed to update recipe title.');
      setSaving(false);
      return;
    }
    if (data) setRecipes(prev => prev.map(r => r.id === editingId ? data : r));
    setSaving(false);
    cancelEdit();
  };

  const handleDelete = (recipe) => {
    showConfirm('Delete Recipe', `Delete "${recipe.title}"? This will also remove it from all users' cookbooks.`, async () => {
      const { error } = await deleteRecipe(recipe.id);
      if (!error) setRecipes(prev => prev.filter(r => r.id !== recipe.id));
    });
  };

  return (
    <div style={panelStyle}>
      {saveError && (
        <div style={{ margin: '0.75rem 1rem 0', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600 }}>
          {saveError}
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Title</th>
              <th style={thStyle}>AI Model</th>
              <th style={thStyle}>Created</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recipes.length === 0 ? (
              <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>No recipes found</td></tr>
            ) : recipes.map(r => {
              const isEditing = editingId === r.id;
              return (
                <tr key={r.id}>
                  <td style={{ ...tdStyle, fontWeight: '600' }}>
                    {isEditing ? (
                      <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                        style={{ padding: '0.3rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.9rem', width: '100%', outline: 'none' }}
                        autoFocus />
                    ) : r.title}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{formatModelProvider(r.model_provider)}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{formatDate(r.created_at)}</td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button onClick={saveTitle} disabled={saving} style={{ ...actionBtn, color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}><Check size={16} /></button>
                        <button onClick={cancelEdit} style={{ ...actionBtn, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}><X size={16} /></button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button onClick={() => startEdit(r)} style={actionBtn}><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(r)} style={{ ...actionBtn, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}><Trash2 size={16} /></button>
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
  );
}
