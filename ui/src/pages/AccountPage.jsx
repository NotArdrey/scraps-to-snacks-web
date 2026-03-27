import { useContext, useState } from 'react';
import { User, LogOut, Mail, Lock, Eye, EyeOff, ChevronRight, CreditCard, Settings } from 'lucide-react';
import { AppContext } from '../AppContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function AccountPage() {
  const { user, subscription } = useContext(AppContext);
  const navigate = useNavigate();

  const [editingField, setEditingField] = useState(null); // 'email' | 'password' | null
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
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

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setEmailLoading(true);
    setEmailMsg(null);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) {
      setEmailMsg({ type: 'error', text: error.message });
    } else {
      setEmailMsg({ type: 'success', text: 'Confirmation sent to your new email. Check your inbox.' });
      setNewEmail('');
      setTimeout(() => setEditingField(null), 2500);
    }
    setEmailLoading(false);
  };

  const handleChangePassword = async (e) => {
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
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordMsg({ type: 'error', text: error.message });
    } else {
      setPasswordMsg({ type: 'success', text: 'Password updated successfully.' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setEditingField(null), 2500);
    }
    setPasswordLoading(false);
  };

  const planName = subscription?.subscription_plans?.display_name || 'Free';
  const planStatus = subscription?.status || 'none';

  // Shared styles
  const panelStyle = {
    background: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(12px)',
    borderRadius: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  };

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.25rem 1.75rem',
    cursor: 'pointer',
    transition: 'background 0.15s',
  };

  const dividerStyle = {
    height: '1px',
    background: 'rgba(0, 0, 0, 0.06)',
    margin: '0 1.75rem',
  };

  const rowIconWrap = (bg) => ({
    width: '40px', height: '40px', borderRadius: '50%',
    background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  });

  const editLinkStyle = {
    color: '#f97316', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
    background: 'none', border: 'none', padding: 0, transition: 'color 0.15s',
  };

  const inputStyle = {
    width: '100%', padding: '0.8rem 1rem', borderRadius: '12px',
    border: '2px solid rgba(226, 232, 240, 0.8)', background: 'rgba(255, 255, 255, 0.9)',
    fontSize: '0.95rem', color: '#1a202c', outline: 'none', transition: 'border-color 0.2s',
  };

  const saveBtnStyle = {
    padding: '0.7rem 1.75rem',
    background: 'linear-gradient(135deg, #f97316, #f43f5e)',
    color: '#fff', border: 'none', borderRadius: '9999px',
    fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem',
  };

  const cancelBtnStyle = {
    padding: '0.7rem 1.75rem',
    background: 'transparent', border: '1px solid #cbd5e1',
    color: '#64748b', borderRadius: '9999px',
    fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem',
  };

  const msgStyle = (type) => ({
    background: type === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
    border: `1px solid ${type === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
    borderRadius: '10px', padding: '0.7rem 1rem', marginBottom: '1rem',
    color: type === 'error' ? '#ef4444' : '#10b981', fontSize: '0.875rem',
  });

  return (
    <div style={{ maxWidth: '680px', margin: '3rem auto' }}>
      {/* Hero Banner */}
      <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', marginBottom: '2.5rem', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("https://images.unsplash.com/photo-1543362906-acfc16c67564?q=80&w=2070&auto=format&fit=crop")', backgroundPosition: 'center', backgroundSize: 'cover', zIndex: 1 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.3))', zIndex: 2 }} />
        <div style={{ position: 'relative', zIndex: 3, padding: '3.5rem 2.5rem', color: 'white', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1.25rem', borderRadius: '50%', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <User size={36} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 0.25rem 0', color: 'white' }}>My Account</h2>
            <p style={{ fontSize: '1.1rem', color: '#e2e8f0', margin: 0 }}>Manage your profile and settings</p>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <div style={panelStyle}>

        {/* Email Row */}
        <div
          style={rowStyle}
          onClick={() => editingField !== 'email' && openEdit('email')}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
            <div style={rowIconWrap('rgba(249, 115, 22, 0.1)')}>
              <Mail size={20} color="#f97316" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Email Address</div>
              <div style={{ fontSize: '1rem', color: '#1f2937', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || 'Loading...'}</div>
            </div>
          </div>
          <button style={editLinkStyle} onClick={(e) => { e.stopPropagation(); openEdit('email'); }}>Edit</button>
        </div>

        {/* Email Edit Form */}
        {editingField === 'email' && (
          <div style={{ padding: '0 1.75rem 1.5rem 4.75rem' }}>
            {emailMsg && <div style={msgStyle(emailMsg.type)}>{emailMsg.text}</div>}
            <form onSubmit={handleChangeEmail}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '0.4rem' }}>New Email</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Enter new email address" style={inputStyle} required autoFocus />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" disabled={emailLoading} style={{ ...saveBtnStyle, opacity: emailLoading ? 0.7 : 1 }}>
                  {emailLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={closeEdit} style={cancelBtnStyle}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div style={dividerStyle} />

        {/* Password Row */}
        <div
          style={rowStyle}
          onClick={() => editingField !== 'password' && openEdit('password')}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div style={rowIconWrap('rgba(244, 63, 94, 0.1)')}>
              <Lock size={20} color="#f43f5e" />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Password</div>
              <div style={{ fontSize: '1rem', color: '#1f2937', fontWeight: '500' }}>••••••••</div>
            </div>
          </div>
          <button style={editLinkStyle} onClick={(e) => { e.stopPropagation(); openEdit('password'); }}>Edit</button>
        </div>

        {/* Password Edit Form */}
        {editingField === 'password' && (
          <div style={{ padding: '0 1.75rem 1.5rem 4.75rem' }}>
            {passwordMsg && <div style={msgStyle(passwordMsg.type)}>{passwordMsg.text}</div>}
            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '0.4rem' }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    style={{ ...inputStyle, paddingRight: '3rem' }}
                    required minLength={6} autoFocus
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.25rem' }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '0.4rem' }}>Confirm New Password</label>
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" style={inputStyle} required minLength={6} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" disabled={passwordLoading} style={{ ...saveBtnStyle, opacity: passwordLoading ? 0.7 : 1 }}>
                  {passwordLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={closeEdit} style={cancelBtnStyle}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div style={dividerStyle} />

        {/* Subscription Row */}
        <div
          style={rowStyle}
          onClick={() => navigate('/subscription')}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div style={rowIconWrap('rgba(132, 204, 22, 0.1)')}>
              <CreditCard size={20} color="#84cc16" />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Subscription</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1rem', color: '#1f2937', fontWeight: '500' }}>{planName}</span>
                <span style={{
                  padding: '0.1rem 0.5rem', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase',
                  background: planStatus === 'active' ? 'rgba(16, 185, 129, 0.1)' : planStatus === 'trialing' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                  color: planStatus === 'active' ? '#10b981' : planStatus === 'trialing' ? '#f59e0b' : '#64748b',
                }}>
                  {planStatus === 'active' ? 'Active' : planStatus === 'trialing' ? 'Trial' : 'None'}
                </span>
              </div>
            </div>
          </div>
          <ChevronRight size={20} color="#94a3b8" />
        </div>

        <div style={dividerStyle} />

        {/* Diet & Allergies Row */}
        <div
          style={rowStyle}
          onClick={() => navigate('/onboarding')}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div style={rowIconWrap('rgba(99, 102, 241, 0.1)')}>
              <Settings size={20} color="#6366f1" />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Diet & Allergies</div>
              <div style={{ fontSize: '1rem', color: '#1f2937', fontWeight: '500' }}>Manage preferences</div>
            </div>
          </div>
          <ChevronRight size={20} color="#94a3b8" />
        </div>

        <div style={dividerStyle} />

        {/* Sign Out Row */}
        <div
          style={{ ...rowStyle, cursor: 'pointer' }}
          onClick={handleLogout}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.03)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div style={rowIconWrap('rgba(239, 68, 68, 0.1)')}>
              <LogOut size={20} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontSize: '1rem', color: '#ef4444', fontWeight: '600' }}>Sign Out</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
