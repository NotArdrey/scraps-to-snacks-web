import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import BrandIcon from '../components/BrandIcon';
import ThemeToggle from '../components/ThemeToggle';
import { AppContext } from '../AppContextValue';
import { fetchPaymentAttempt, formatPlanPrice, verifyPaymongoCheckout } from '../services/subscription';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshSubscription, isOnboarded } = useContext(AppContext);
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [redirecting, setRedirecting] = useState(false);

  const attemptId = searchParams.get('attempt_id');
  const checkoutSessionId = searchParams.get('checkout_session_id');
  const destination = isOnboarded ? '/account' : '/onboarding';

  const loadAttempt = useCallback(async () => {
    if (!attemptId && !checkoutSessionId) {
      setError('Missing payment reference.');
      setLoading(false);
      return;
    }

    let data;
    try {
      const result = await fetchPaymentAttempt({ attemptId, checkoutSessionId });
      if (result.error) {
        setError(result.error.message || 'Unable to check payment status.');
        setLoading(false);
        return;
      }
      data = result.data;
    } catch (statusError) {
      setError(statusError.message || 'Unable to check payment status.');
      setLoading(false);
      return;
    }

    let nextAttempt = data;

    if (data?.status === 'pending' && data.id) {
      try {
        const verification = await verifyPaymongoCheckout(data.id);
        if (verification?.status === 'paid') {
          const { data: refreshedAttempt } = await fetchPaymentAttempt({ attemptId: data.id });
          nextAttempt = refreshedAttempt || data;
        }
      } catch (verificationError) {
        setError(verificationError.message || 'Unable to verify PayMongo checkout.');
        setLoading(false);
        return;
      }
    }

    setAttempt(nextAttempt);
    setError('');
    setLoading(false);

    if (nextAttempt?.status === 'paid' && nextAttempt.subscription_id && !redirecting) {
      setRedirecting(true);
      await refreshSubscription();
      navigate(destination, { replace: true });
    }
  }, [attemptId, checkoutSessionId, destination, navigate, redirecting, refreshSubscription]);

  useEffect(() => {
    let isMounted = true;

    const tick = async () => {
      if (isMounted) await loadAttempt();
    };

    tick();
    const interval = setInterval(tick, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [loadAttempt]);

  const plan = attempt?.subscription_plans;
  const isPaid = attempt?.status === 'paid' && attempt?.subscription_id;
  const isPending = !isPaid && attempt?.status !== 'failed';

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

        {loading ? (
          <>
            <RefreshCw size={38} style={{ animation: 'spin 1s linear infinite', color: '#7a5ed3', marginBottom: '1rem' }} />
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            <h1 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem' }}>Checking payment</h1>
            <p style={{ color: 'var(--theme-text-muted)', margin: 0 }}>Hang tight while we confirm your checkout.</p>
          </>
        ) : error ? (
          <>
            <AlertCircle size={38} color="var(--danger-color)" style={{ marginBottom: '1rem' }} />
            <h1 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem' }}>Payment status unavailable</h1>
            <p style={{ color: 'var(--theme-text-muted)', margin: '0 0 1.5rem' }}>{error}</p>
            <button onClick={() => navigate('/subscription')} style={{ width: '100%', padding: '1rem', background: '#7a5ed3', color: '#fff', border: 0, borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
              Back to Plans
            </button>
          </>
        ) : isPaid ? (
          <>
            <CheckCircle size={38} color="var(--success-color)" style={{ marginBottom: '1rem' }} />
            <h1 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem' }}>Payment confirmed</h1>
            <p style={{ color: 'var(--theme-text-muted)', margin: 0 }}>Preparing your account...</p>
          </>
        ) : (
          <>
            <Clock size={38} color="#f59e0b" style={{ marginBottom: '1rem' }} />
            <h1 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem' }}>Payment pending</h1>
            <p style={{ color: 'var(--theme-text-muted)', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              {isPending ? 'PayMongo has returned you to the app. Access unlocks after PayMongo confirms payment.' : 'This checkout did not complete.'}
            </p>
            {plan && (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ fontWeight: 800 }}>{plan.display_name}</div>
                <div style={{ color: 'var(--theme-text-muted)', marginTop: '0.25rem' }}>{formatPlanPrice(plan)}</div>
              </div>
            )}
            <button onClick={loadAttempt} style={{ width: '100%', padding: '1rem', background: '#7a5ed3', color: '#fff', border: 0, borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
              Check Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
