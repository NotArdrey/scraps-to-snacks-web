import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChefHat, List, Scan, Book, LogOut } from 'lucide-react';
import { AppContext } from '../AppContext';

export default function Navigation({ setIsAuthenticated }) {
  const { setIsSubscribed } = useContext(AppContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsSubscribed(false);
    navigate('/login');
  };

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
          <List size={18}/> Pantry
        </NavLink>
        <NavLink to="/scan" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <Scan size={18}/> Magic Scan
        </NavLink>
        <NavLink to="/cookbook" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <Book size={18}/> Cookbook
        </NavLink>
      </div>

      <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>
        <LogOut size={16} /> Logout
      </button>
    </nav>
  );
}
