import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CreditCard } from 'lucide-react';
import BrandIcon from '../components/BrandIcon';
import ThemeToggle from '../components/ThemeToggle';
import { fetchPaymentAttempt, formatPlanPrice, startPaymongoCheckout } from '../services/subscription';

export default function PaymentCancel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState('');

  const attemptId = searchParams.get('attempt_id');
  const checkoutSessionId = searchParams.get('checkout_session_id');

  const loadAttempt = useCallback(async () => {
    const { data, error: attemptError } = await fetchPaymentAttempt({ attemptId, checkoutSessionId });
    if (attemptError) {
      setError(attemptError.message || 'Unable to load checkout details.');
    } else {
      setAttempt(data);
    }
    setLoading(false);
  }, [attemptId, checkoutSessionId]);

  useEffect(() => {
    const timeoutId = setTimeout(loadAttempt, 0);
    return () => clearTimeout(timeoutId);
  }, [loadAttempt]);

  const handleRetry = async () => {
    const planCode = attempt?.subscription_plans?.plan_code;
    if (!planCode) {
      navigate('/subscription');
      return;
    }

    setRetrying(true);
    setError('');

    try {
      const checkout = await startPaymongoCheckout(planCode);
      window.location.assign(checkout.checkout_url);
    } catch (checkoutError) {
      setError(checkoutError.message);
      setRetrying(false);
    }
  };

  const plan = attempt?.subscription_plans;

  return (
    <div style={{ position: 'absolute', inset: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)', color: 'var(--theme-text-main)', fontFamily: 'Outfit, sans-serif', padding: '2rem', zIndex: 50 }}>
      <ThemeToggle />
      <div style={{ width: '100%', maxWidth: '480px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <BrandIcon size={30} />
          <span style={{ fontSize: '1.3rem', fontWeight: 800 }}>
            Scraps<span style={{ color: '#7a5ed3' }}>2</span>Snacks
          </span>
        </div>

        <CreditCard size={38} color="#7a5ed3" style={{ marginBottom: '1rem' }} />
        <h1 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem' }}>Checkout canceled</h1>
        <p style={{ color: 'var(--theme-text-muted)', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
          Your account is ready, but access stays locked until payment is confirmed.
        </p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger-color)', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {!loading && plan && (
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: 800 }}>{plan.display_name}</div>
            <div style={{ color: 'var(--theme-text-muted)', marginTop: '0.25rem' }}>{formatPlanPrice(plan)}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => navigate('/subscription')} style={{ flex: 1, padding: '1rem', background: 'transparent', color: 'var(--theme-text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
            <ArrowLeft size={17} /> Plans
          </button>
          <button onClick={handleRetry} disabled={retrying} style={{ flex: 1, padding: '1rem', background: '#7a5ed3', color: '#fff', border: 0, borderRadius: '8px', fontWeight: 700, cursor: 'pointer', opacity: retrying ? 0.7 : 1 }}>
            {retrying ? 'Opening...' : 'Retry'}
          </button>
        </div>
      </div>
    </div>
  );
}
