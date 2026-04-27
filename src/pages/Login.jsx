import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import BrandIcon from '../components/BrandIcon';
import ThemeToggle from '../components/ThemeToggle';
import { supabase } from '../lib/supabase';
import { CAROUSEL_IMAGES, CAROUSEL_INTERVAL_MS } from '../constants/images';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const openForgotPassword = () => {
    setError(null);
    setNotice(null);
    setResetEmail(email);
    setShowForgotPassword(true);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!resetEmail.trim()) {
      setError('Enter the email address for your account.');
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setNotice('Password reset instructions have been sent to your email.');
    setShowForgotPassword(false);
  };

  return (
    <div className="split-auth-page split-auth-login" style={{ position: 'absolute', top: 0, left: 0, width: '100vw', minHeight: '100vh', display: 'flex', backgroundColor: 'var(--bg-main)', color: 'var(--theme-text-main)', fontFamily: 'Outfit, sans-serif', zIndex: 50 }}>
      <ThemeToggle className="split-auth-theme-toggle" style={{ right: 'auto', left: '1.5rem' }} />

      {/* Left Side - Form */}
      <div className="split-auth-form-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="split-auth-form-card" style={{ width: '100%', maxWidth: '440px' }}>
          <div className="split-auth-mobile-brand" aria-label="Scraps2Snacks">
            <BrandIcon size={30} color="var(--primary-color)" />
            <span>Scraps<span>2</span>Snacks</span>
          </div>
          <h2 className="split-auth-heading" style={{ fontSize: '2.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>Log in to your account</h2>
          <p className="split-auth-subtitle" style={{ color: 'var(--theme-text-muted)', marginBottom: '2.5rem', fontSize: '1rem' }}>
            Don't have an account? <Link to="/register" style={{ color: '#7a5ed3', textDecoration: 'none' }}>Create one</Link>
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

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--theme-text-main)', outline: 'none' }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--theme-text-main)', outline: 'none' }}
              />
            </div>

            <div className="split-auth-form-options" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="remember" style={{ accentColor: '#7a5ed3', width: '16px', height: '16px' }} />
                <label htmlFor="remember" style={{ color: 'var(--theme-text-muted)', fontSize: '0.9rem' }}>Remember me</label>
              </div>
              <button
                type="button"
                onClick={openForgotPassword}
                disabled={resetLoading}
                style={{ color: '#7a5ed3', fontSize: '0.9rem', textDecoration: 'none', background: 'transparent', border: 'none', padding: 0, cursor: resetLoading ? 'not-allowed' : 'pointer', opacity: resetLoading ? 0.7 : 1 }}
              >
                Forgot password?
              </button>
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '1rem', background: '#7a5ed3', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '500', cursor: 'pointer', marginTop: '1rem', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Signing in...' : 'Log in'}
            </button>
          </form>
        </div>
      </div>

      {/* Right Side - Image Background */}
      <div className="split-auth-media-panel" style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between', 
        padding: '3rem', 
        backgroundImage: `linear-gradient(to bottom, rgba(var(--bg-rgb), 0.4), rgba(var(--bg-rgb), 0.9)), url("${CAROUSEL_IMAGES[currentImageIndex]}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderTopLeftRadius: '2rem',
        borderBottomLeftRadius: '2rem',
        transition: 'background-image 1s ease-in-out'
      }}>
        <div className="split-auth-media-brand" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '1px' }}>
              Scraps<span style={{ color: '#7a5ed3' }}>2</span>Snacks
            </span>
            <BrandIcon size={32} color="#ffffff" />
          </div>
        </div>

        <div className="split-auth-media-copy" style={{ textAlign: 'right' }}>
          <h1 className="split-auth-media-heading" style={{ fontSize: '3.5rem', fontWeight: 'bold', margin: '0 0 1rem 0', lineHeight: 1.2 }}>
            Welcome Back,<br />Chef!
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
            {CAROUSEL_IMAGES.map((_, idx) => (
              <div key={idx} style={{ height: '4px', width: '24px', backgroundColor: currentImageIndex === idx ? 'var(--theme-text-main)' : 'var(--surface-border)', borderRadius: '2px', transition: 'background-color 0.5s ease' }}></div>
            ))}
          </div>
        </div>
      </div>

      {showForgotPassword && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-password-title"
          onClick={() => !resetLoading && setShowForgotPassword(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.58)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', zIndex: 100 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '420px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--theme-text-main)', boxShadow: 'var(--shadow-lg)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 id="forgot-password-title" style={{ margin: 0, fontSize: '1.25rem' }}>Forgot password</h3>
              <button
                type="button"
                aria-label="Close forgot password"
                onClick={() => setShowForgotPassword(false)}
                disabled={resetLoading}
                style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--theme-text-main)', cursor: resetLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: resetLoading ? 0.7 : 1 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleForgotPassword} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0, color: 'var(--theme-text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Enter your account email and we will send password reset instructions.
              </p>

              <input
                type="email"
                placeholder="Email"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                required
                autoFocus
                style={{ width: '100%', padding: '1rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--theme-text-main)', outline: 'none' }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  disabled={resetLoading}
                  style={{ padding: '0.75rem 1rem', background: 'transparent', color: 'var(--theme-text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600, cursor: resetLoading ? 'not-allowed' : 'pointer', opacity: resetLoading ? 0.7 : 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  style={{ padding: '0.75rem 1rem', background: '#7a5ed3', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600, cursor: resetLoading ? 'not-allowed' : 'pointer', opacity: resetLoading ? 0.7 : 1 }}
                >
                  {resetLoading ? 'Sending...' : 'Send reset link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
