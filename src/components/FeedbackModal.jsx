import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const variantConfig = {
  success: {
    icon: CheckCircle,
    color: '#10b981',
    actionText: 'OK',
  },
  error: {
    icon: AlertCircle,
    color: '#ef4444',
    actionText: 'Close',
  },
  warning: {
    icon: AlertTriangle,
    color: '#f59e0b',
    actionText: 'OK',
  },
  info: {
    icon: Info,
    color: '#7a5ed3',
    actionText: 'OK',
  },
};

export default function FeedbackModal({ open, title, message, variant = 'success', actionText, onClose }) {
  if (!open) return null;

  const config = variantConfig[variant] || variantConfig.info;
  const Icon = config.icon;
  const buttonText = actionText || config.actionText;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(6px)',
        zIndex: 2100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card confirm-modal-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        aria-describedby="feedback-modal-message"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '2.5rem 2rem 2rem',
          animation: 'slideUpFade 0.25s ease-out',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: config.color }} />

        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: `${config.color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}>
          <Icon size={30} color={config.color} />
        </div>

        <h3 id="feedback-modal-title" style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
          {title}
        </h3>

        <p id="feedback-modal-message" style={{ margin: '0 0 2rem', color: 'var(--text-tertiary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
          {message}
        </p>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '0.75rem 1.5rem',
            background: config.color,
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            fontWeight: '700',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
