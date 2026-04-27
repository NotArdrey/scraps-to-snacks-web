import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'lucide-react';
import BrandIcon from '../components/BrandIcon';
import ThemeToggle from '../components/ThemeToggle';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setNotice('Password updated. Redirecting you to log in...');
    await supabase.auth.signOut();
    setTimeout(() => navigate('/login'), 1200);
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)', color: 'var(--theme-text-main)', fontFamily: 'Outfit, sans-serif', padding: '2rem', zIndex: 50 }}>
      <ThemeToggle />

      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <BrandIcon size={32} color="#ffffff" />
          <span style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '1px' }}>
            Scraps<span style={{ color: '#7a5ed3' }}>2</span>Snacks
          </span>
        </div>

        <h2 style={{ fontSize: '2.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>Reset password</h2>
        <p style={{ color: 'var(--theme-text-muted)', marginBottom: '2.5rem', fontSize: '1rem' }}>
          Enter a new password for your account.
        </p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger-color)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {notice && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success-color)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <CheckCircle size={18} />
            {notice}
          </div>
        )}

        <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--theme-text-main)', outline: 'none' }}
          />

          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--theme-text-main)', outline: 'none' }}
          />

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '1rem', background: '#7a5ed3', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>

        <p style={{ color: 'var(--theme-text-muted)', marginTop: '2rem', fontSize: '0.95rem' }}>
          Remember your password? <Link to="/login" style={{ color: '#7a5ed3', textDecoration: 'none' }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
