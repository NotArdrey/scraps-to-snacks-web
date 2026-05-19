import { useContext, useRef, useState } from 'react';
import { User, LogOut, Mail, Lock, Eye, EyeOff, ChevronRight, CreditCard, Settings, ShieldCheck, CalendarDays } from 'lucide-react';
import { AppContext } from '../AppContextValue';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import FeedbackModal from '../components/FeedbackModal';
import { formatDate } from '../utils/formatters';

function getPlanStatusLabel(status) {
  if (status === 'active') return 'Active';
  if (status === 'trialing') return 'Trial';
  return 'None';
}

export default function Account() {
  const { user, subscription } = useContext(AppContext);
  const navigate = useNavigate();

  const [editingField, setEditingField] = useState(null);
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [confirmEdit, setConfirmEdit] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const confirmEditInFlightRef = useRef(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setFeedback({
        title: 'Sign out failed',
        message: error.message || 'Unable to sign out. Please try again.',
        variant: 'error',
      });
      return;
    }
    navigate('/login', { replace: true, state: null });
  };

  const openEdit = (field) => {
    setEditingField(field);
    setEmailMsg(null);
    setPasswordMsg(null);
    setNewEmail('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  const closeEdit = () => {
    setEditingField(null);
    setEmailMsg(null);
    setPasswordMsg(null);
  };

  const requestChangeEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setConfirmEdit({
      type: 'email',
      title: 'Confirm Email Change',
      message: `Send a confirmation email to ${newEmail.trim()}?`,
      confirmText: 'Send',
      value: newEmail.trim(),
    });
  };

  const confirmChangeEmail = async (email) => {
    setEmailLoading(true);
    setEmailMsg(null);
    const { error } = await supabase.auth.updateUser({ email });
    if (error) {
      setEmailMsg({ type: 'error', text: error.message });
      setFeedback({
        title: 'Email update failed',
        message: error.message,
        variant: 'error',
      });
    } else {
      const message = 'Confirmation sent to your new email. Check your inbox.';
      setEmailMsg({ type: 'success', text: message });
      setNewEmail('');
      setEditingField(null);
      setFeedback({
        title: 'Email confirmation sent',
        message,
        variant: 'success',
      });
    }
    setEmailLoading(false);
  };

  const requestChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setConfirmEdit({
      type: 'password',
      title: 'Confirm Password Change',
      message: 'Save this new password for your account?',
      confirmText: 'Save',
      value: newPassword,
    });
  };

  const confirmChangePassword = async (password) => {
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setPasswordMsg({ type: 'error', text: error.message });
      setFeedback({
        title: 'Password update failed',
        message: error.message,
        variant: 'error',
      });
    } else {
      const message = 'Password updated successfully.';
      setPasswordMsg({ type: 'success', text: message });
      setNewPassword('');
      setConfirmPassword('');
      setEditingField(null);
      setFeedback({
        title: 'Password updated',
        message,
        variant: 'success',
      });
    }
    setPasswordLoading(false);
  };

  const handleConfirmEdit = async () => {
    if (!confirmEdit || confirmEditInFlightRef.current) return;
    confirmEditInFlightRef.current = true;
    const pending = confirmEdit;
    setConfirmEdit(null);
    try {
      if (pending.type === 'email') {
        await confirmChangeEmail(pending.value);
      } else if (pending.type === 'password') {
        await confirmChangePassword(pending.value);
      }
    } finally {
      confirmEditInFlightRef.current = false;
    }
  };

  const closeFeedback = () => setFeedback(null);

  const planName = subscription?.subscription_plans?.display_name || (subscription ? 'Active subscription' : 'No active subscription');
  const planStatus = subscription?.status || 'none';
  const planStatusLabel = getPlanStatusLabel(planStatus);
  const subscriptionStartsAt = subscription?.starts_at ? formatDate(subscription.starts_at) : null;
  const subscriptionEndsAt = subscription?.ends_at ? formatDate(subscription.ends_at) : null;
  const subscriptionPeriod = subscriptionStartsAt && subscriptionEndsAt
    ? `${subscriptionStartsAt} to ${subscriptionEndsAt}`
    : subscriptionStartsAt
      ? `Started ${subscriptionStartsAt}`
      : null;
  const accountEmail = user?.email || 'Loading...';
  const accountInitial = (user?.email?.[0] || 'S').toUpperCase();

  return (
    <div className="account-hub-page">
      <section className="account-command-header" aria-labelledby="account-title">
        <div className="account-command-icon" aria-hidden="true">
          <User size={28} />
        </div>
        <div className="account-command-copy">
          <span className="account-kicker">Profile settings</span>
          <h1 id="account-title">Account</h1>
          <p>Manage sign-in details, subscription status, and recipe preferences from one settings hub.</p>
          <div className="account-chip-row">
            <span>{accountEmail}</span>
            <span className={planStatus === 'active' || planStatus === 'trialing' ? 'success' : ''}>{planStatusLabel}</span>
          </div>
        </div>
      </section>

      <section className="account-overview-grid" aria-label="Account overview">
        <div className="account-stat-card">
          <span>Email</span>
          <strong>{accountEmail}</strong>
          <small>{editingField === 'email' ? 'Editing email' : 'Confirmed by Supabase auth'}</small>
        </div>
        <div className={`account-stat-card ${planStatus === 'active' || planStatus === 'trialing' ? 'success' : 'warning'}`}>
          <span>Plan status</span>
          <strong>{planStatusLabel}</strong>
          <small>{planName}</small>
        </div>
        <div className="account-stat-card">
          <span>Subscription period</span>
          <strong>{subscriptionEndsAt || 'Open'}</strong>
          <small>{subscriptionPeriod || 'No billing window available'}</small>
        </div>
        <div className="account-stat-card">
          <span>Security</span>
          <strong>{editingField === 'password' ? 'Editing' : 'Protected'}</strong>
          <small>Password changes require confirmation</small>
        </div>
      </section>

      <div className="account-settings-layout">
        <section className="account-settings-panel" aria-labelledby="account-settings-title">
          <div className="account-panel-heading">
            <span className="account-kicker">Settings</span>
            <h2 id="account-settings-title">Sign-in and preferences</h2>
            <p>Update only the field you need, then confirm the change.</p>
          </div>

          <div
            className={`account-setting-row ${editingField === 'email' ? 'active' : ''}`}
            onClick={() => editingField !== 'email' && openEdit('email')}
          >
            <div className="account-row-main">
              <span className="account-row-icon">
                <Mail size={20} />
              </span>
              <span>
                <small>Email address</small>
                <strong>{accountEmail}</strong>
              </span>
            </div>
            <button type="button" className="account-inline-action" onClick={(e) => { e.stopPropagation(); openEdit('email'); }}>Edit</button>
          </div>

          {editingField === 'email' && (
            <div className="account-edit-form">
              {emailMsg && <div className={`account-message ${emailMsg.type}`}>{emailMsg.text}</div>}
              <form onSubmit={requestChangeEmail}>
                <label className="account-field">
                  <span>New email</span>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Enter new email address" className="input-field" required autoFocus />
                </label>
                <div className="account-form-actions">
                  <button type="submit" disabled={emailLoading} className="btn-primary">
                    {emailLoading ? 'Saving...' : 'Save changes'}
                  </button>
                  <button type="button" onClick={closeEdit} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div
            className={`account-setting-row ${editingField === 'password' ? 'active' : ''}`}
            onClick={() => editingField !== 'password' && openEdit('password')}
          >
            <div className="account-row-main">
              <span className="account-row-icon amber">
                <Lock size={20} />
              </span>
              <span>
                <small>Password</small>
                <strong>Password saved</strong>
              </span>
            </div>
            <button type="button" className="account-inline-action" onClick={(e) => { e.stopPropagation(); openEdit('password'); }}>Edit</button>
          </div>

          {editingField === 'password' && (
            <div className="account-edit-form">
              {passwordMsg && <div className={`account-message ${passwordMsg.type}`}>{passwordMsg.text}</div>}
              <form onSubmit={requestChangePassword}>
                <label className="account-field">
                  <span>New password</span>
                  <div className="account-password-field">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="input-field"
                      required
                      minLength={6}
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="account-visibility-button" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
                <label className="account-field">
                  <span>Confirm new password</span>
                  <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" className="input-field" required minLength={6} />
                </label>
                <div className="account-form-actions">
                  <button type="submit" disabled={passwordLoading} className="btn-primary">
                    {passwordLoading ? 'Saving...' : 'Save changes'}
                  </button>
                  <button type="button" onClick={closeEdit} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="account-setting-row navigates" onClick={() => navigate('/subscription')}>
            <div className="account-row-main">
              <span className="account-row-icon green">
                <CreditCard size={20} />
              </span>
              <span>
                <small>Subscription</small>
                <strong>{planName}</strong>
                {subscriptionPeriod && <em>{subscriptionPeriod}</em>}
              </span>
            </div>
            <ChevronRight size={20} />
          </div>

          <div className="account-setting-row navigates" onClick={() => navigate('/onboarding')}>
            <div className="account-row-main">
              <span className="account-row-icon">
                <Settings size={20} />
              </span>
              <span>
                <small>Diet and allergies</small>
                <strong>Manage preferences</strong>
              </span>
            </div>
            <ChevronRight size={20} />
          </div>

          <button type="button" className="account-signout-row" onClick={handleLogout}>
            <span className="account-row-main">
              <span className="account-row-icon danger">
                <LogOut size={20} />
              </span>
              <span>
                <strong>Sign out</strong>
              </span>
            </span>
          </button>
        </section>

        <aside className="account-profile-panel" aria-label="Account summary">
          <div className="account-profile-avatar">{accountInitial}</div>
          <div>
            <span className="account-kicker">Signed in as</span>
            <h2>{accountEmail}</h2>
            <p>{planName}</p>
          </div>
          <div className="account-profile-list">
            <div>
              <ShieldCheck size={18} />
              <span>Password protected</span>
            </div>
            <div>
              <CalendarDays size={18} />
              <span>{subscriptionPeriod || 'Subscription dates unavailable'}</span>
            </div>
            <div>
              <Settings size={18} />
              <span>Preferences sync with Pantry and Magic Scan</span>
            </div>
          </div>
          <button type="button" onClick={() => navigate('/onboarding')} className="btn-secondary">
            <Settings size={17} /> Preferences
          </button>
        </aside>
      </div>

      <ConfirmModal
        open={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        confirmText="Sign Out"
        variant="logout"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <ConfirmModal
        open={!!confirmEdit}
        title={confirmEdit?.title || ''}
        message={confirmEdit?.message || ''}
        confirmText={confirmEdit?.confirmText || 'Confirm'}
        variant="success"
        onConfirm={handleConfirmEdit}
        onCancel={() => setConfirmEdit(null)}
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
