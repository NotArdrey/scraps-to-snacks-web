import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import BrandIcon from '../components/BrandIcon';
import ThemeToggle from '../components/ThemeToggle';
import LoadingAlert from '../components/LoadingAlert';
import { AppContext } from '../AppContextValue';
import { supabase } from '../lib/supabase';
import {
  fetchPaymentAttempt,
  formatPlanPrice,
  verifyPaymongoCheckout,
  verifyRegistrationPaymongoCheckout,
} from '../services/subscription';

const REGISTRATION_CHECKOUT_ATTEMPT_KEY = 'registration-checkout-attempt-id';
const REGISTRATION_CHECKOUT_SESSION_KEY = 'registration-checkout-session-id';
const REGISTRATION_CHECKOUT_EMAIL_KEY = 'registration-checkout-email';
const REGISTRATION_CHECKOUT_PENDING_KEY = 'registration-checkout-pending';
const REGISTRATION_CONFIRMATION_EMAIL_KEY_PREFIX = 'registration-confirmation-email';
const PENDING_EMAIL_LOCK_TTL_MS = 60 * 1000;
const signupConfirmationEmailRequests = new Map();

const getAuthRedirectUrl = () => `${window.location.origin}/login`;

const getStoredRegistrationCheckout = () => {
  if (typeof window === 'undefined') {
    return { attemptId: null, checkoutSessionId: null, email: '' };
  }

  return {
    attemptId: sessionStorage.getItem(REGISTRATION_CHECKOUT_ATTEMPT_KEY),
    checkoutSessionId: sessionStorage.getItem(REGISTRATION_CHECKOUT_SESSION_KEY),
    email: sessionStorage.getItem(REGISTRATION_CHECKOUT_EMAIL_KEY) || '',
  };
};

const clearStoredRegistrationCheckout = () => {
  if (typeof window === 'undefined') return;

  sessionStorage.removeItem(REGISTRATION_CHECKOUT_ATTEMPT_KEY);
  sessionStorage.removeItem(REGISTRATION_CHECKOUT_SESSION_KEY);
  sessionStorage.removeItem(REGISTRATION_CHECKOUT_EMAIL_KEY);
  sessionStorage.removeItem(REGISTRATION_CHECKOUT_PENDING_KEY);
};

const getSignupConfirmationEmailKey = ({ attemptId, checkoutSessionId, email }) => {
  const identifier = attemptId || checkoutSessionId || email;
  return identifier ? `${REGISTRATION_CONFIRMATION_EMAIL_KEY_PREFIX}:${identifier}` : null;
};

const reserveSignupConfirmationEmail = (key) => {
  if (typeof window === 'undefined' || !key) return 'reserved';

  const now = Date.now();
  const rawStatus = sessionStorage.getItem(key);
  if (rawStatus) {
    try {
      const status = JSON.parse(rawStatus);
      if (status?.state === 'sent') return 'sent';
      if (status?.state === 'pending' && now - Number(status.timestamp || 0) < PENDING_EMAIL_LOCK_TTL_MS) {
        return 'pending';
      }
    } catch {
      // Ignore malformed status and replace it below.
    }
  }

  sessionStorage.setItem(key, JSON.stringify({ state: 'pending', timestamp: now }));
  return 'reserved';
};

const markSignupConfirmationEmailSent = (key) => {
  if (typeof window === 'undefined' || !key) return;
  sessionStorage.setItem(key, JSON.stringify({ state: 'sent', timestamp: Date.now() }));
};

const releaseSignupConfirmationEmail = (key) => {
  if (typeof window === 'undefined' || !key) return;
  sessionStorage.removeItem(key);
};

const sendSignupConfirmationEmail = async (email, dedupeKey) => {
  if (!email) return false;
  if (dedupeKey && signupConfirmationEmailRequests.has(dedupeKey)) {
    return signupConfirmationEmailRequests.get(dedupeKey);
  }

  const request = (async () => {
    const reservation = reserveSignupConfirmationEmail(dedupeKey);
    if (reservation === 'sent' || reservation === 'pending') return true;

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });

    if (error) {
      console.warn('Unable to send signup confirmation email after payment', error);
      releaseSignupConfirmationEmail(dedupeKey);
      return false;
    }

    markSignupConfirmationEmailSent(dedupeKey);
    return true;
  })();

  if (dedupeKey) signupConfirmationEmailRequests.set(dedupeKey, request);

  try {
    return await request;
  } finally {
    if (dedupeKey) signupConfirmationEmailRequests.delete(dedupeKey);
  }
};

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshSubscription, isOnboarded, signOut } = useContext(AppContext);
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [redirecting, setRedirecting] = useState(false);

  const attemptId = searchParams.get('attempt_id');
  const checkoutSessionId = searchParams.get('checkout_session_id');
  const returnFlow = searchParams.get('flow');
  const registrationCheckout = getStoredRegistrationCheckout();
  const destination = isOnboarded ? '/pantry' : '/onboarding';
  const isRegistrationReturn = returnFlow === 'registration';

  const loadAttempt = useCallback(async () => {
    if (!attemptId && !checkoutSessionId) {
      setError('Missing payment reference.');
      setLoading(false);
      return;
    }

    if (isRegistrationReturn) {
      if (!attemptId) {
        setError('Missing registration payment reference.');
        setLoading(false);
        return;
      }

      try {
        const verification = await verifyRegistrationPaymongoCheckout(attemptId);
        const nextAttempt = verification?.attempt ?? null;
        setAttempt(nextAttempt);
        setError('');
        setLoading(false);

        if (verification?.status === 'paid' && verification?.subscription_id && !redirecting) {
          setRedirecting(true);
          const email = registrationCheckout.email || verification.user_email || user?.email || '';
          const emailSent = await sendSignupConfirmationEmail(email, getSignupConfirmationEmailKey({
            attemptId,
            checkoutSessionId: nextAttempt?.paymongo_checkout_session_id,
            email,
          }));
          clearStoredRegistrationCheckout();
          if (user) await signOut();
          navigate('/login', {
            replace: true,
            state: {
              email,
              notice: emailSent
                ? 'Payment confirmed. We sent a confirmation email. Confirm your email, then log in to start onboarding.'
                : 'Payment confirmed. Log in to start onboarding.',
            },
          });
        }
      } catch (verificationError) {
        setError(verificationError.message || 'Unable to verify PayMongo checkout.');
        setLoading(false);
      }
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

      const paidAttemptId = nextAttempt.id || attemptId;
      const paidCheckoutSessionId = nextAttempt.paymongo_checkout_session_id || checkoutSessionId;
      const isStoredRegistrationCheckout = Boolean(
        (paidAttemptId && registrationCheckout.attemptId === paidAttemptId) ||
        (paidCheckoutSessionId && registrationCheckout.checkoutSessionId === paidCheckoutSessionId),
      );
      const isRegistrationCheckout = (
        returnFlow === 'registration' ||
        nextAttempt.checkout_flow === 'registration' ||
        isStoredRegistrationCheckout
      );

      if (isRegistrationCheckout) {
        const email = registrationCheckout.email || user?.email || '';
        const emailSent = await sendSignupConfirmationEmail(email, getSignupConfirmationEmailKey({
          attemptId: paidAttemptId,
          checkoutSessionId: paidCheckoutSessionId,
          email,
        }));
        clearStoredRegistrationCheckout();
        await signOut();
        navigate('/login', {
          replace: true,
          state: {
            email,
            notice: emailSent
              ? 'Payment confirmed. We sent a confirmation email. Confirm your email, then log in to start onboarding.'
              : 'Payment confirmed. Log in to start onboarding.',
          },
        });
        return;
      }

      navigate(destination, { replace: true });
    }
  }, [
    attemptId,
    checkoutSessionId,
    destination,
    isRegistrationReturn,
    navigate,
    redirecting,
    refreshSubscription,
    registrationCheckout.attemptId,
    registrationCheckout.checkoutSessionId,
    registrationCheckout.email,
    returnFlow,
    signOut,
    user,
  ]);

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

  if (loading) {
    return <LoadingAlert title="Checking payment" message="Confirming your PayMongo checkout status." />;
  }

  return (
    <div className="payment-page" style={{ position: 'absolute', inset: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)', color: 'var(--theme-text-main)', fontFamily: 'Outfit, sans-serif', padding: '2rem', zIndex: 50 }}>
      <ThemeToggle />
      <div className="payment-card" style={{ width: '100%', maxWidth: '480px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <BrandIcon size={30} />
          <span style={{ fontSize: '1.3rem', fontWeight: 800 }}>
            Scraps<span style={{ color: '#7a5ed3' }}>2</span>Snacks
          </span>
        </div>

        {error ? (
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
