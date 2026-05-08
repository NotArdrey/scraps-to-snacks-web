export const EMAIL_CONFIRMATION_COMPLETE_KEY = 'email-confirmation-complete';
export const EMAIL_CONFIRMATION_CALLBACK_KEY = 'email-confirmation-callback-pending';

export function getAuthRedirectParams(href) {
  const targetHref = href || window.location.href;
  const url = new URL(targetHref);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));

  return {
    pathname: url.pathname,
    searchParams: url.searchParams,
    hashParams,
    type: url.searchParams.get('type') || hashParams.get('type'),
  };
}

export function isEmailConfirmationCallback(href) {
  if (typeof window === 'undefined' && !href) return false;

  const { pathname, searchParams, hashParams, type } = getAuthRedirectParams(href);
  const hasCallbackParams = (
    searchParams.has('code') ||
    searchParams.has('token_hash') ||
    hashParams.has('access_token') ||
    hashParams.has('refresh_token') ||
    hashParams.has('token_hash')
  );

  if (pathname === '/reset-password' || type === 'recovery') return false;
  return type === 'signup' || type === 'email_change' || hasCallbackParams;
}

export function markInitialEmailConfirmationCallback() {
  if (typeof window === 'undefined') return;
  if (!isEmailConfirmationCallback()) return;

  sessionStorage.setItem(EMAIL_CONFIRMATION_CALLBACK_KEY, 'true');
}

export function hasPendingEmailConfirmationCallback() {
  return (
    typeof window !== 'undefined' &&
    sessionStorage.getItem(EMAIL_CONFIRMATION_CALLBACK_KEY) === 'true'
  );
}

export function clearPendingEmailConfirmationCallback() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(EMAIL_CONFIRMATION_CALLBACK_KEY);
}
