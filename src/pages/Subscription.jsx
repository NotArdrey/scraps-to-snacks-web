import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Check, ArrowLeft, CreditCard } from 'lucide-react';
import BrandIcon from '../components/BrandIcon';
import ThemeToggle from '../components/ThemeToggle';
import LoadingAlert from '../components/LoadingAlert';
import { AppContext } from '../AppContextValue';
import { fetchActivePlans, formatPlanPrice, getPlanBillingLabel, startPaymongoCheckout } from '../services/subscription';
import { CAROUSEL_IMAGES, CAROUSEL_INTERVAL_MS, HERO_IMAGES } from '../constants/images';
import { formatDate } from '../utils/formatters';

export default function Subscription() {
  const navigate = useNavigate();
  const { user, refreshSubscription, hasActiveSubscription, subscription } = useContext(AppContext);
  const currentPlanCode = subscription?.subscription_plans?.plan_code ?? null;
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
      const activePlan = data.find(plan => plan.plan_code === currentPlanCode);
      if (activePlan) {
        setSelectedPlan(activePlan.plan_code);
      } else if (data.length > 0) {
        setSelectedPlan(data[0].plan_code);
      }
      setFetching(false);
    };
    load();
  }, [currentPlanCode]);

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
    if (hasActiveSubscription) {
      const currentPlanName = subscription?.subscription_plans?.display_name || 'Active subscription';
      const subscriptionStartsAt = subscription?.starts_at ? formatDate(subscription.starts_at) : null;
      const subscriptionEndsAt = subscription?.ends_at ? formatDate(subscription.ends_at) : null;
      const subscriptionPeriod = subscriptionStartsAt && subscriptionEndsAt
        ? `${subscriptionStartsAt} to ${subscriptionEndsAt}`
        : subscriptionStartsAt
          ? `Started ${subscriptionStartsAt}`
          : null;

      return (
        <div style={{ maxWidth: '760px', margin: '3rem auto' }}>
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

          <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', marginBottom: '2.5rem', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("${HERO_IMAGES.account}")`, backgroundPosition: 'center', backgroundSize: 'cover', zIndex: 1 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.82), rgba(0,0,0,0.28))', zIndex: 2 }} />
            <div style={{ position: 'relative', zIndex: 3, padding: '3.5rem 2.5rem', color: 'white', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1.25rem', borderRadius: '50%', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <CreditCard size={36} color="white" />
              </div>
              <div>
                <h2 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 0.25rem 0', color: 'white' }}>Subscription</h2>
                <p style={{ fontSize: '1.1rem', color: '#e2e8f0', margin: 0 }}>View your current plan or update billing</p>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div style={{ padding: '1.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(132, 204, 22, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CreditCard size={20} color="#84cc16" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Current plan</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1rem', color: 'var(--theme-text-main)', fontWeight: 700 }}>{currentPlanName}</span>
                  <span style={{ padding: '0.1rem 0.5rem', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                    Active
                  </span>
                </div>
                {subscriptionPeriod && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--theme-text-muted)', marginTop: '0.25rem', fontWeight: 500 }}>
                    {subscriptionPeriod}
                  </div>
                )}
              </div>
            </div>
            <div style={{ height: '1px', background: 'var(--border-color)', margin: '0 1.75rem' }} />
            <div style={{ padding: '1.75rem', color: 'var(--theme-text-muted)' }}>
              Loading available plans...
            </div>
          </div>
        </div>
      );
    }

    return <LoadingAlert title="Loading plans" message="Fetching the available subscription options." />;
  }

  if (hasActiveSubscription) {
    const currentPlanName = subscription?.subscription_plans?.display_name || 'Active subscription';
    const subscriptionStartsAt = subscription?.starts_at ? formatDate(subscription.starts_at) : null;
    const subscriptionEndsAt = subscription?.ends_at ? formatDate(subscription.ends_at) : null;
    const subscriptionPeriod = subscriptionStartsAt && subscriptionEndsAt
      ? `${subscriptionStartsAt} to ${subscriptionEndsAt}`
      : subscriptionStartsAt
        ? `Started ${subscriptionStartsAt}`
        : null;

    const panelStyle = {
      background: 'var(--bg-card)',
      borderRadius: '24px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
      overflow: 'hidden',
      border: '1px solid var(--border-color)'
    };

    const dividerStyle = {
      height: '1px',
      background: 'var(--border-color)',
      margin: '0 1.75rem',
    };

    const planOptionStyle = (selected) => ({
      width: '100%',
      background: selected ? 'rgba(122, 94, 211, 0.1)' : 'transparent',
      cursor: 'pointer',
      borderRadius: '12px',
      border: selected ? '1px solid #7a5ed3' : '1px solid var(--border-color)',
      padding: '1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      textAlign: 'left',
      color: 'var(--theme-text-main)',
      transition: 'background 0.15s, border-color 0.15s',
    });

    return (
      <>
        {loading && <LoadingAlert title="Opening PayMongo" message="Preparing secure checkout for your selected plan." />}
        <div style={{ maxWidth: '760px', margin: '3rem auto' }}>
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

        <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', marginBottom: '2.5rem', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("${HERO_IMAGES.account}")`, backgroundPosition: 'center', backgroundSize: 'cover', zIndex: 1 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.82), rgba(0,0,0,0.28))', zIndex: 2 }} />
          <div style={{ position: 'relative', zIndex: 3, padding: '3.5rem 2.5rem', color: 'white', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1.25rem', borderRadius: '50%', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <CreditCard size={36} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 0.25rem 0', color: 'white' }}>Subscription</h2>
              <p style={{ fontSize: '1.1rem', color: '#e2e8f0', margin: 0 }}>View your current plan or update billing</p>
            </div>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={{ padding: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(132, 204, 22, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CreditCard size={20} color="#84cc16" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Current plan</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1rem', color: 'var(--theme-text-main)', fontWeight: 700 }}>{currentPlanName}</span>
                  <span style={{ padding: '0.1rem 0.5rem', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                    Active
                  </span>
                </div>
                {subscriptionPeriod && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--theme-text-muted)', marginTop: '0.25rem', fontWeight: 500 }}>
                    {subscriptionPeriod}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={dividerStyle} />

          <div style={{ padding: '1.75rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Available plans</div>
              <div style={{ fontSize: '1rem', color: 'var(--theme-text-main)', fontWeight: 600 }}>Your current plan is selected</div>
            </div>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger-color)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {plans.length === 0 ? (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', color: 'var(--theme-text-muted)' }}>
                  No paid plans are available right now.
                </div>
              ) : plans.map(plan => {
                const selected = selectedPlan === plan.plan_code;
                const current = currentPlanCode === plan.plan_code;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.plan_code)}
                    style={planOptionStyle(selected)}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700 }}>{plan.display_name}</span>
                        {current && (
                          <span style={{ padding: '0.08rem 0.45rem', borderRadius: '9999px', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(132, 204, 22, 0.12)', color: '#84cc16' }}>
                            Current
                          </span>
                        )}
                      </span>
                      <span style={{ display: 'block', color: 'var(--theme-text-muted)', fontSize: '0.86rem', marginTop: '0.3rem' }}>{plan.description}</span>
                      <span style={{ display: 'block', color: '#9d84e8', fontSize: '0.78rem', fontWeight: 700, marginTop: '0.35rem' }}>{getPlanBillingLabel(plan)}</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                      <span style={{ fontWeight: 800 }}>{formatPlanPrice(plan)}</span>
                      <span style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        border: selected ? 'none' : '2px solid var(--border-color)',
                        background: selected ? '#7a5ed3' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {selected && <Check size={13} color="#ffffff" />}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={dividerStyle} />

          <div style={{ padding: '1.5rem 1.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate('/account')}
              style={{
                padding: '0.7rem 1.75rem',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--theme-text-muted)',
                borderRadius: '9999px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSelect}
              disabled={loading || !selectedPlan}
              style={{
                padding: '0.7rem 1.75rem',
                background: '#7a5ed3',
                color: '#fff',
                border: 'none',
                borderRadius: '9999px',
                fontWeight: 700,
                cursor: loading || !selectedPlan ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                opacity: loading || !selectedPlan ? 0.7 : 1,
              }}
            >
              {selectedPlan === currentPlanCode ? 'Renew Current Plan' : 'Change Plan'}
            </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      {loading && <LoadingAlert title="Opening PayMongo" message="Preparing secure checkout for your selected plan." />}
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
              {hasActiveSubscription ? 'Renew or Change Plan' : 'Continue to Payment'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
