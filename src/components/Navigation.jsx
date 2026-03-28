import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChefHat, List, Scan, Book, User } from 'lucide-react';

export default function Navigation() {
  return (
    <nav className="nav-bar">
      <div className="nav-brand">
        <div style={{ background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))', padding: '0.4rem', borderRadius: '50%', display: 'flex' }}>
          <ChefHat size={20} color="white" />
        </div>
        Scraps to Snacks
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
      </div>
    </nav>
  );
}
