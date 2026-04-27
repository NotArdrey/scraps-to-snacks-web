import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { List, Scan, Book, User, Moon, Sun } from 'lucide-react';
import { AppContext } from '../AppContextValue';
import BrandIcon from './BrandIcon';

export default function Navigation() {
  const { theme, toggleTheme } = useContext(AppContext);

  return (
    <nav className="nav-bar">
      <div className="nav-brand">
        <BrandIcon size={36} />
        <span className="brand-text">Scraps<span className="brand-text-accent">2</span>Snacks</span>
      </div>

      <div className="nav-links">
        <NavLink to="/pantry" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <List size={18}/> <span>Pantry</span>
        </NavLink>
        <NavLink to="/scan" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <Scan size={18}/> <span>Magic Scan</span>
        </NavLink>
        <NavLink to="/cookbook" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <Book size={18}/> <span>Cookbook</span>
        </NavLink>
        <NavLink to="/account" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <User size={18}/> <span>Account</span>
        </NavLink>
        <button 
          onClick={toggleTheme} 
          style={{ 
            background: 'var(--surface-color)', 
            border: '1px solid var(--surface-border)', 
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-full)',
            padding: '0.4rem',
            marginLeft: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </nav>
  );
}
