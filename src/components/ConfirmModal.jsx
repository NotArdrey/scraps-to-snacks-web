import React from 'react';
import { AlertTriangle, LogOut, Trash2, Check } from 'lucide-react';

const iconMap = {
  danger: <AlertTriangle size={28} color="#ef4444" />,
  warning: <AlertTriangle size={28} color="#f59e0b" />,
  logout: <LogOut size={28} color="#ef4444" />,
  success: <Check size={28} color="#10b981" />,
};

export default function ConfirmModal({ open, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger', onConfirm, onCancel }) {
  if (!open) return null;

  const icon = iconMap[variant] || iconMap.danger;

  const accentColor =
    variant === 'success' ? '#10b981'
    : variant === 'warning' ? '#f59e0b'
    : '#ef4444';

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(6px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card confirm-modal-card"
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
        {/* Top accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: accentColor }} />

        {/* Icon */}
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: `${accentColor}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}>
          {icon}
        </div>

        {/* Title */}
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
          {title}
        </h3>

        {/* Message */}
        <p style={{ margin: '0 0 2rem', color: 'var(--text-tertiary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
          {message}
        </p>

        {/* Actions */}
        <div className="confirm-modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            className="btn-secondary"
            style={{ padding: '0.7rem 1.5rem', flex: 1 }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '0.7rem 1.5rem',
              background: variant === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              fontWeight: '700',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
              flex: 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
