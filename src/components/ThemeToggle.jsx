import React, { useContext } from 'react';
import { Moon, Sun } from 'lucide-react';
import { AppContext } from '../AppContext';

export default function ThemeToggle({ style: overrideStyle } = {}) {
  const { theme, toggleTheme } = useContext(AppContext);

  return (
    <button
      onClick={toggleTheme}
      style={{
        position: 'fixed',
        top: '1.5rem',
        right: '1.5rem',
        zIndex: 100,
        ...overrideStyle,
        background: 'var(--surface-color)',
        border: '1px solid var(--surface-border)',
        color: 'var(--text-primary)',
        borderRadius: 'var(--radius-full)',
        padding: '0.6rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: 'var(--shadow-md)',
        transition: 'all 0.2s ease'
      }}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
