import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Check, Eye, EyeOff, X } from 'lucide-react';
import BrandIcon from '../components/BrandIcon';
import ThemeToggle from '../components/ThemeToggle';
import { supabase } from '../lib/supabase';
import { fetchActivePlans, formatPlanPrice, getPlanBillingLabel, startPaymongoCheckout } from '../services/subscription';
import { CAROUSEL_IMAGES, CAROUSEL_INTERVAL_MS } from '../constants/images';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [plansLoading, setPlansLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadPlans = async () => {
      const data = await fetchActivePlans({ paidOnly: true });
      if (!isMounted) return;
      setPlans(data);
      if (data.length > 0) setSelectedPlan(data[0].plan_code);
      setPlansLoading(false);
    };

    loadPlans();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!selectedPlan) {
      setError('Please choose a paid plan to continue.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    
    const displayName = `${firstName} ${lastName}`.trim();

    const { data, error: signUpError } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          display_name: displayName,
          selected_plan_code: selectedPlan,
        }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !signInData.session) {
        setError('Account created. Please confirm your email, then log in to finish payment.');
        setLoading(false);
        return;
      }
    }

    try {
      const checkout = await startPaymongoCheckout(selectedPlan);
      window.location.assign(checkout.checkout_url);
    } catch (checkoutError) {
      setError(checkoutError.message);
      setLoading(false);
    }
  };

  return (
    <div className="split-auth-page split-auth-register" style={{ position: 'absolute', top: 0, left: 0, width: '100vw', minHeight: '100vh', display: 'flex', backgroundColor: 'var(--bg-main)', color: 'var(--theme-text-main)', fontFamily: 'Outfit, sans-serif', zIndex: 50 }}>
      <ThemeToggle className="split-auth-theme-toggle" />
      {/* Left Side - Image Background */}
      <div className="split-auth-media-panel" style={{ 
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
        <div className="split-auth-media-brand" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BrandIcon size={32} color="#ffffff" />
            <span style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '1px' }}>
              Scraps<span style={{ color: '#7a5ed3' }}>2</span>Snacks
            </span>
          </div>
        </div>

        <div className="split-auth-media-copy">
          <h1 className="split-auth-media-heading" style={{ fontSize: '3.5rem', fontWeight: 'bold', margin: '0 0 1rem 0', lineHeight: 1.2 }}>
            Savor the Flavor,<br />Stop the Waste
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '2rem' }}>
            {CAROUSEL_IMAGES.map((_, idx) => (
              <div key={idx} style={{ height: '4px', width: '24px', backgroundColor: currentImageIndex === idx ? 'var(--theme-text-main)' : 'var(--surface-border)', borderRadius: '2px', transition: 'background-color 0.5s ease' }}></div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="split-auth-form-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="split-auth-form-card" style={{ width: '100%', maxWidth: '440px' }}>
          <div className="split-auth-mobile-brand" aria-label="Scraps2Snacks">
            <BrandIcon size={30} color="var(--primary-color)" />
            <span>Scraps<span>2</span>Snacks</span>
          </div>
          <h2 className="split-auth-heading" style={{ fontSize: '2.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>Create an account</h2>
          <p className="split-auth-subtitle" style={{ color: 'var(--theme-text-muted)', marginBottom: '2.5rem', fontSize: '1rem' }}>
            Already have an account? <Link to="/login" style={{ color: '#7a5ed3', textDecoration: 'none' }}>Log in</Link>
          </p>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger-color)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="split-auth-name-row" style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  style={{ width: '100%', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--theme-text-main)', outline: 'none' }}
                />
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  style={{ width: '100%', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--theme-text-main)', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--theme-text-main)', outline: 'none' }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                style={{ width: '100%', padding: '1rem 3rem 1rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--theme-text-main)', outline: 'none' }}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((current) => !current)}
                style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--theme-text-muted)', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                style={{ width: '100%', padding: '1rem 3rem 1rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--theme-text-main)', outline: 'none' }}
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                onClick={() => setShowConfirmPassword((current) => !current)}
                style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--theme-text-muted)', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ color: 'var(--theme-text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Choose a plan</div>
              {plansLoading ? (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', color: 'var(--theme-text-muted)', fontSize: '0.9rem' }}>
                  Loading plans...
                </div>
              ) : plans.length === 0 ? (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '1rem', color: 'var(--danger-color)', fontSize: '0.9rem' }}>
                  No paid plans are available right now.
                </div>
              ) : (
                plans.map(plan => (
                  <button
                    className="split-auth-plan-option"
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.plan_code)}
                    style={{
                      width: '100%',
                      background: selectedPlan === plan.plan_code ? 'rgba(122, 94, 211, 0.1)' : 'var(--bg-card)',
                      border: selectedPlan === plan.plan_code ? '2px solid #7a5ed3' : '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '1rem',
                      color: 'var(--theme-text-main)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 700, fontSize: '0.95rem' }}>{plan.display_name}</span>
                      <span style={{ display: 'block', color: 'var(--theme-text-muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>{plan.description}</span>
                      <span style={{ display: 'block', color: '#9d84e8', fontSize: '0.78rem', fontWeight: 700, marginTop: '0.35rem' }}>{getPlanBillingLabel(plan)}</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                      <span style={{ fontWeight: 800 }}>{formatPlanPrice(plan)}</span>
                      <span style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        border: selectedPlan === plan.plan_code ? 'none' : '2px solid var(--border-color)',
                        background: selectedPlan === plan.plan_code ? '#7a5ed3' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {selectedPlan === plan.plan_code && <Check size={13} color="#ffffff" />}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <input type="checkbox" id="terms" required style={{ accentColor: '#7a5ed3', width: '16px', height: '16px', flexShrink: 0 }} />
              <label htmlFor="terms" style={{ color: 'var(--theme-text-muted)', fontSize: '0.9rem' }}>
                I agree to the
              </label>
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                style={{ color: '#7a5ed3', textDecoration: 'underline', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Terms & Conditions
              </button>
            </div>

            <button type="submit" disabled={loading || plansLoading || plans.length === 0} style={{ width: '100%', padding: '1rem', background: '#7a5ed3', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '500', cursor: 'pointer', marginTop: '1rem', opacity: loading || plansLoading || plans.length === 0 ? 0.7 : 1 }}>
              {loading ? 'Redirecting to PayMongo...' : 'Create account and pay'}
            </button>
          </form>
        </div>
      </div>

      {showTerms && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-title"
          onClick={() => setShowTerms(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.58)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', zIndex: 100 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="auth-dialog-card"
            style={{ width: '100%', maxWidth: '560px', maxHeight: '80vh', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--theme-text-main)', boxShadow: 'var(--shadow-lg)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 id="terms-title" style={{ margin: 0, fontSize: '1.25rem' }}>Terms & Conditions</h3>
              <button
                type="button"
                aria-label="Close terms"
                onClick={() => setShowTerms(false)}
                style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--theme-text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', color: 'var(--theme-text-muted)', lineHeight: 1.6, fontSize: '0.95rem' }}>
              <p style={{ marginTop: 0 }}>By creating an account, you agree to use Scraps2Snacks responsibly and provide accurate account and payment information.</p>
              <p>Recipe suggestions and pantry insights are provided for planning support only. You remain responsible for checking ingredient freshness, allergens, safe food handling, and dietary suitability.</p>
              <p>Uploaded ingredient images and account data may be processed to provide app features, improve pantry tracking, and support subscription/payment services.</p>
              <p style={{ marginBottom: 0 }}>You also agree not to misuse the service, attempt unauthorized access, or submit content that violates applicable laws or the rights of others.</p>
            </div>

            <div className="auth-dialog-actions" style={{ padding: '0 1.25rem 1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowTerms(false)}
                style={{ padding: '0.75rem 1rem', background: '#7a5ed3', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
