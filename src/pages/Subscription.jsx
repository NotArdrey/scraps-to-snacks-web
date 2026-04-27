import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Check, ArrowLeft } from 'lucide-react';
import BrandIcon from '../components/BrandIcon';
import ThemeToggle from '../components/ThemeToggle';
import { AppContext } from '../AppContextValue';
import { fetchActivePlans, formatPlanPrice, getPlanBillingLabel, startPaymongoCheckout } from '../services/subscription';
import { CAROUSEL_IMAGES, CAROUSEL_INTERVAL_MS } from '../constants/images';

export default function Subscription() {
  const navigate = useNavigate();
  const { user, refreshSubscription, hasActiveSubscription } = useContext(AppContext);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const load = async () => {
      const data = await fetchActivePlans({ paidOnly: true });
      setPlans(data);
      if (data.length > 0) setSelectedPlan(data[0].plan_code);
      setFetching(false);
    };
    load();
  }, []);

  const handleSelect = async () => {
    if (!user || !selectedPlan) return;
    setLoading(true);
    setError('');

    const plan = plans.find(p => p.plan_code === selectedPlan);
    if (!plan) { setLoading(false); return; }

    try {
      const checkout = await startPaymongoCheckout(plan.plan_code);
      window.location.assign(checkout.checkout_url);
    } catch (checkoutError) {
      setError(checkoutError.message);
      await refreshSubscription();
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)', color: 'var(--theme-text-main)', zIndex: 50 }}>
        <p style={{ color: 'var(--theme-text-muted)' }}>Loading plans...</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', minHeight: '100vh', display: 'flex', backgroundColor: 'var(--bg-main)', color: 'var(--theme-text-main)', fontFamily: 'Outfit, sans-serif', zIndex: 50 }}>
      <ThemeToggle />
      {/* Left Side - Image Background */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between', 
        padding: '3rem', 
        backgroundImage: `linear-gradient(to bottom, rgba(var(--bg-rgb), 0.4), rgba(var(--bg-rgb), 0.9)), url("${CAROUSEL_IMAGES[currentImageIndex]}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderTopRightRadius: '2rem',
        borderBottomRightRadius: '2rem',
        transition: 'background-image 1s ease-in-out'
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BrandIcon size={32} color="#ffffff" />
            <span style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '1px' }}>
              Scraps<span style={{ color: '#7a5ed3' }}>2</span>Snacks
            </span>
          </div>
        </div>

        <div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 'bold', margin: '0 0 1rem 0', lineHeight: 1.2 }}>
            Unlock Culinary<br />Excellence
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '2rem' }}>
            {CAROUSEL_IMAGES.map((_, idx) => (
              <div key={idx} style={{ height: '4px', width: '24px', backgroundColor: currentImageIndex === idx ? 'var(--theme-text-main)' : 'var(--surface-border)', borderRadius: '2px', transition: 'background-color 0.5s ease' }}></div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '500px' }}>
          {hasActiveSubscription && (
            <button onClick={() => navigate('/account')} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'none', border: 'none', color: 'var(--theme-text-muted)',
              cursor: 'pointer', fontSize: '0.95rem', padding: 0, marginBottom: '1.5rem',
              transition: 'color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--theme-text-main)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--theme-text-muted)'}
            >
              <ArrowLeft size={18} /> Back to Account
            </button>
          )}
          <h2 style={{ fontSize: '2.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>Choose Your Plan</h2>
          <p style={{ color: 'var(--theme-text-muted)', marginBottom: '2.5rem', fontSize: '1rem' }}>
            Pay securely with PayMongo Checkout.
          </p>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {plans.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.5rem', color: 'var(--theme-text-muted)' }}>
                No paid plans are available right now.
              </div>
            ) : plans.map(plan => (
              <div
                key={plan.id}
                style={{
                  background: selectedPlan === plan.plan_code ? 'rgba(122, 94, 211, 0.1)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  borderRadius: '12px',
                  border: selectedPlan === plan.plan_code ? '2px solid #7a5ed3' : '1px solid var(--border-color)',
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setSelectedPlan(plan.plan_code)}
              >
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', fontWeight: '600' }}>{plan.display_name}</h3>
                  <p style={{ color: 'var(--theme-text-muted)', fontSize: '0.9rem', margin: 0 }}>{plan.description}</p>
                  <p style={{ color: '#9d84e8', fontSize: '0.8rem', fontWeight: 700, margin: '0.45rem 0 0' }}>{getPlanBillingLabel(plan)}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{formatPlanPrice(plan)}</div>
                  <div style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    border: selectedPlan === plan.plan_code ? 'none' : '2px solid var(--border-color)',
                    background: selectedPlan === plan.plan_code ? '#7a5ed3' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {selectedPlan === plan.plan_code && <Check size={14} color="#ffffff" />}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleSelect} disabled={loading || !selectedPlan} style={{ width: '100%', padding: '1rem', background: '#7a5ed3', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '500', cursor: 'pointer', marginTop: '2rem', opacity: loading || !selectedPlan ? 0.7 : 1 }}>
            {loading ? 'Opening PayMongo...' : hasActiveSubscription ? 'Renew or Change Plan' : 'Continue to Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
