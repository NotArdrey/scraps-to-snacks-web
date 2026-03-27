import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check } from 'lucide-react';
import { AppContext } from '../AppContext';

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { setIsSubscribed } = useContext(AppContext);
  const [selectedPlan, setSelectedPlan] = useState('trial');

  const plans = [
    { id: 'trial', name: '7-Day Free Trial', price: '$0', desc: 'Try all features completely free.' },
    { id: 'monthly', name: 'Monthly Pro', price: '$4.99/mo', desc: 'Flexible monthly billing.' },
    { id: 'annual', name: 'Annual Pro', price: '$49.99/yr', desc: 'Save ~15% with yearly billing.' },
  ];

  const handleSelect = () => {
    setIsSubscribed(true);
    navigate('/pantry');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '3rem auto', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', background: 'rgba(139, 92, 246, 0.2)', padding: '0.75rem', borderRadius: '50%', marginBottom: '1rem' }}>
        <Sparkles size={28} color="var(--primary-color)" />
      </div>
      <h2 className="page-title">Choose Your Plan</h2>
      <p className="page-subtitle">Unlock AI magic parsing and unrestricted recipes.</p>
      
      <div className="grid-container" style={{ marginTop: '3rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {plans.map(plan => (
          <div 
            key={plan.id} 
            className="glass-card"
            style={{ 
              cursor: 'pointer',
              border: selectedPlan === plan.id ? '2px solid var(--primary-color)' : '1px solid var(--surface-border)',
              transform: selectedPlan === plan.id ? 'translateY(-5px)' : 'none',
              boxShadow: selectedPlan === plan.id ? '0 10px 25px rgba(139, 92, 246, 0.3)' : 'var(--shadow-md)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              padding: '2rem 1.5rem'
            }} 
            onClick={() => setSelectedPlan(plan.id)}
          >
            {selectedPlan === plan.id && (
              <div style={{ position: 'absolute', top: '-12px', right: '-12px', background: 'var(--primary-color)', borderRadius: '50%', padding: '0.25rem', display: 'flex' }}>
                <Check size={16} color="white" />
              </div>
            )}
            <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0' }}>{plan.name}</h3>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary-color)', margin: '1rem 0' }}>{plan.price}</div>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', margin: 0 }}>{plan.desc}</p>
          </div>
        ))}
      </div>

      <button onClick={handleSelect} className="btn-primary" style={{ marginTop: '3rem', padding: '1rem 3rem', fontSize: '1.1rem' }}>
        Continue
      </button>
    </div>
  );
}
