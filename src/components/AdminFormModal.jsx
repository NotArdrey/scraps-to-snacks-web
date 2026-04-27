import React from 'react';
import { X } from 'lucide-react';

export default function AdminFormModal({ open, title, onClose, onSubmit, submitText = 'Save', loading = false, children }) {
  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div
      onClick={onClose}
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
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="glass-card admin-form-modal-card"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '0',
          animation: 'slideUpFade 0.25s ease-out',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(135deg, var(--primary-color), var(--primary-hover))' }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.5rem 1.75rem 0',
        }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-tertiary)', padding: '0.25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '8px', transition: 'color var(--transition-fast)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="admin-form-modal-body" style={{ padding: '1.25rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {children}
        </div>

        {/* Footer */}
        <div className="admin-form-modal-footer" style={{
          display: 'flex', gap: '0.75rem', justifyContent: 'flex-end',
          padding: '1rem 1.75rem 1.5rem',
          borderTop: '1px solid var(--border-color)',
        }}>
          <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '0.65rem 1.25rem' }}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ padding: '0.65rem 1.25rem', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Saving...' : submitText}
          </button>
        </div>
      </form>
    </div>
  );
}
