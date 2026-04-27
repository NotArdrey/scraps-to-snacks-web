import { LoaderCircle } from 'lucide-react';

export default function LoadingAlert({ title = 'Loading', message = 'Please wait while we prepare this view.' }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      aria-busy="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'rgba(0, 0, 0, 0.42)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          width: 'min(420px, 100%)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-lg)',
          padding: '1.5rem',
          color: 'var(--theme-text-main)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(122, 94, 211, 0.15)',
            color: '#7a5ed3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <LoaderCircle size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', lineHeight: 1.25 }}>
            {title}
          </h2>
          <p style={{ margin: 0, color: 'var(--theme-text-muted)', fontSize: '0.92rem', lineHeight: 1.45 }}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
