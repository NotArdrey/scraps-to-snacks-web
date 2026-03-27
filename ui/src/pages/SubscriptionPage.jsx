import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check } from 'lucide-react';
import { AppContext } from '../AppContext';
import { fetchActivePlans, createSubscription, formatPlanPrice } from '../services/subscriptionService';
import { modernStyles } from '../styles';

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { user, refreshSubscription } = useContext(AppContext);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await fetchActivePlans();
      setPlans(data);
      if (data.length > 0) setSelectedPlan(data[0].plan_code);
      setFetching(false);
    };
    load();
  }, []);

  const handleSelect = async () => {
    if (!user || !selectedPlan) return;
    setLoading(true);

    const plan = plans.find(p => p.plan_code === selectedPlan);
    if (!plan) { setLoading(false); return; }

    await createSubscription(user.id, plan);
    await refreshSubscription();
    setLoading(false);
    navigate('/onboarding');
  };

  if (fetching) {
    return (
      <div style={{ maxWidth: '800px', margin: '3rem auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading plans...</p>
      </div>
    );
  }

  return (
    <div style={{ ...modernStyles.container, alignItems: 'flex-start', paddingTop: '4rem' }}>
      <div style={{ ...modernStyles.card, maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', background: 'rgba(249, 115, 22, 0.2)', padding: '0.75rem', borderRadius: '50%', marginBottom: '1rem' }}>
          <Sparkles size={28} color="#f97316" />
        </div>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 1rem 0', color: '#1f2937', background: 'linear-gradient(135deg, #f97316, #f43f5e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Choose Your Plan</h2>
        <p style={{ fontSize: '1.125rem', color: '#6b7280', margin: '0 0 2rem 0' }}>Unlock AI magic parsing and unrestricted recipes.</p>

        <div style={{ display: 'grid', gap: '2rem', marginTop: '3rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {plans.map(plan => (
            <div
              key={plan.id}
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                borderRadius: '24px',
                border: selectedPlan === plan.plan_code ? '2px solid #f97316' : '1px solid rgba(255, 255, 255, 0.5)',
                transform: selectedPlan === plan.plan_code ? 'translateY(-5px)' : 'none',
                boxShadow: selectedPlan === plan.plan_code ? '0 10px 25px rgba(249, 115, 22, 0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                padding: '2rem 1.5rem'
              }}
              onClick={() => setSelectedPlan(plan.plan_code)}
            >
              {selectedPlan === plan.plan_code && (
                <div style={{ position: 'absolute', top: '-12px', right: '-12px', background: '#f97316', borderRadius: '50%', padding: '0.25rem', display: 'flex' }}>
                  <Check size={16} color="white" />
                </div>
              )}
              <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0', color: '#1f2937' }}>{plan.display_name}</h3>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f97316', margin: '1rem 0' }}>{formatPlanPrice(plan)}</div>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>{plan.description}</p>
            </div>
          ))}
        </div>

        <button onClick={handleSelect} disabled={loading || !selectedPlan} style={{ marginTop: '3rem', padding: '1rem 3rem', fontSize: '1.1rem', fontWeight: 'bold', border: 'none', borderRadius: '9999px', background: 'linear-gradient(135deg, #f97316, #f43f5e)', color: '#ffffff', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Processing...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
