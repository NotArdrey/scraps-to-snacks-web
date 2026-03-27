import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { modernStyles } from '../styles';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div style={modernStyles.container}>
      <div style={modernStyles.card}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', background: 'linear-gradient(135deg, #f97316, #f43f5e)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem', boxShadow: '0 4px 15px rgba(249, 115, 22, 0.4)' }}>
            <ChefHat size={32} color="white" />
          </div>
          <h2 style={{ ...modernStyles.title, fontSize: '2rem' }}>Welcome Back</h2>
          <p style={modernStyles.subtitle}>Log in to manage your smart pantry</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#ef4444', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={modernStyles.inputContainer}>
            <label htmlFor="email" style={modernStyles.label}>Email Address</label>
            <input type="email" id="email" style={modernStyles.input} placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div style={{ ...modernStyles.inputContainer, marginTop: '1.5rem' }}>
            <label htmlFor="password" style={modernStyles.label}>Password</label>
            <input type="password" id="password" style={modernStyles.input} placeholder="" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          <button type="submit" disabled={loading} style={{ ...modernStyles.buttonPrimary, opacity: loading ? 0.7 : 1, marginTop: '1.5rem' }}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', color: '#cbd5e1' }}>
          Don't have an account? <Link to="/register" style={modernStyles.link}>Register here</Link>
        </div>
      </div>
    </div>
  );
}

