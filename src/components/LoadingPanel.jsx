export default function LoadingPanel({ title = 'Loading', message = 'Please wait while we prepare this view.' }) {
  return (
    <div style={{ width: '100%', maxWidth: '760px', margin: '3rem auto' }}>
      <div
        className="glass-panel"
        aria-busy="true"
        aria-live="polite"
        style={{
          padding: '2rem',
          borderRadius: '8px',
          color: 'var(--theme-text-main)',
        }}
      >
        <h2 style={{ margin: '0 0 0.45rem', fontSize: '1.35rem', lineHeight: 1.25 }}>
          {title}
        </h2>
        <p style={{ margin: 0, color: 'var(--theme-text-muted)', fontSize: '0.96rem', lineHeight: 1.5 }}>
          {message}
        </p>
      </div>
    </div>
  );
}
