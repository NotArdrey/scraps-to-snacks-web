import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChefHat } from 'lucide-react';

export default function LoginPage({ setIsAuthenticated }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setIsAuthenticated(true);
    navigate('/pantry');
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '450px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))', padding: '1rem', borderRadius: '50%', marginBottom: '1rem', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)' }}>
            <ChefHat size={32} color="white" />
          </div>
          <h2 className="page-title" style={{ fontSize: '2rem' }}>Welcome Back</h2>
          <p className="page-subtitle">Log in to manage your smart pantry</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-container">
            <label htmlFor="email" className="input-label">Email Address</label>
            <input type="email" id="email" className="input-field" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          
          <div className="input-container" style={{ marginTop: '1.5rem' }}>
            <label htmlFor="password" className="input-label">Password</label>
            <input type="password" id="password" className="input-field" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1.5rem', padding: '1rem', fontSize: '1.1rem' }}>
            Log In
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--primary-color)', fontWeight: '600' }}>Register here</Link>
        </div>
      </div>
    </div>
  );
}
