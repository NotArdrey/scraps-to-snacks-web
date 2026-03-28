import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { modernStyles } from '../styles';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
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
          <h2 style={{ ...modernStyles.title, fontSize: '2rem' }}>Create Account</h2>
          <p style={modernStyles.subtitle}>Join Scraps to Snacks and reduce food waste!</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#ef4444', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div style={modernStyles.inputContainer}>
            <label htmlFor="reg-email" style={modernStyles.label}>Email Address</label>
            <input type="email" id="reg-email" style={modernStyles.input} placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div style={{ ...modernStyles.inputContainer, marginTop: '1.5rem' }}>
            <label htmlFor="reg-password" style={modernStyles.label}>Password</label>
            <input type="password" id="reg-password" style={modernStyles.input} placeholder="" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>

          <button type="submit" disabled={loading} style={{ ...modernStyles.buttonPrimary, opacity: loading ? 0.7 : 1, marginTop: '1.5rem' }}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', color: '#cbd5e1' }}>
          Already have an account? <Link to="/login" style={modernStyles.link}>Log in</Link>
        </div>
      </div>
    </div>
  );
}

