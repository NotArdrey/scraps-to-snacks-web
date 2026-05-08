import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const EMAIL_CONFIRMATION_COMPLETE_KEY = 'email-confirmation-complete';

function isEmailConfirmationRedirect() {
  if (typeof window === 'undefined') return false;

  const url = new URL(window.location.href);
  if (url.pathname !== '/login') return false;

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
  const type = url.searchParams.get('type') || hashParams.get('type');

  if (type === 'recovery') return false;
  return (
    type === 'signup' ||
    type === 'email_change' ||
    url.searchParams.has('code') ||
    hashParams.has('access_token')
  );
}

function clearAuthRedirectUrl() {
  if (typeof window === 'undefined') return;
  window.history.replaceState({}, document.title, '/login');
}

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const keepConfirmationOnLogin = async (nextSession) => {
      if (!nextSession || !isEmailConfirmationRedirect()) return nextSession;

      sessionStorage.setItem(EMAIL_CONFIRMATION_COMPLETE_KEY, 'true');
      await supabase.auth.signOut();
      clearAuthRedirectUrl();
      return null;
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const nextSession = await keepConfirmationOnLogin(session);
      if (!mounted) return;
      setSession(nextSession);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          sessionStorage.setItem('password-recovery-active', 'true');
        }
        if (event === 'SIGNED_IN') {
          const nextSession = await keepConfirmationOnLogin(session);
          if (!mounted) return;
          if (nextSession !== session) {
            setSession(nextSession);
            setLoading(false);
            return;
          }
        }
        if (event === 'SIGNED_OUT') {
          sessionStorage.removeItem('password-recovery-active');
        }
        if (!mounted) return;
        setSession(session);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    session,
    user: session?.user ?? null,
    loading,
    isAuthenticated: !!session,
    signOut,
  };
}
