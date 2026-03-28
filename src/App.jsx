import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Register from './pages/Register';
import Login from './pages/Login';
import Subscription from './pages/Subscription';
import Onboarding from './pages/Onboarding';
import Pantry from './pages/Pantry';
import MagicScan from './pages/MagicScan';
import Cookbook from './pages/Cookbook';
import Account from './pages/Account';
import { AppContext } from './AppContext';
import './index.css';

function App() {
  const { isAuthenticated, loading, hasActiveSubscription, subLoading, isOnboarded, profileLoading } = useContext(AppContext);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid rgba(139, 92, 246, 0.2)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const isSubscribed = hasActiveSubscription;
  const isFullyOnboarded = isOnboarded;

  const getDefaultRoute = () => {
    if (!isSubscribed) return '/subscription';
    if (!isFullyOnboarded) return '/onboarding';
    return '/pantry';
  };

  return (
    <Router>
      <div className="app-container">
        {isAuthenticated && isSubscribed && isFullyOnboarded && <Navigation />}
        <main className="main-content">
          <Routes>
            <Route path="/" element={
              isAuthenticated ? <Navigate to={getDefaultRoute()} /> : <Navigate to="/login" />
            } />

            <Route path="/login" element={
              isAuthenticated ? <Navigate to={getDefaultRoute()} /> : <Login />
            } />
            <Route path="/register" element={
              isAuthenticated ? <Navigate to={getDefaultRoute()} /> : <Register />
            } />

            <Route path="/subscription" element={
              !isAuthenticated ? <Navigate to="/login" /> :
              <Subscription />
            } />
            <Route path="/onboarding" element={
              !isAuthenticated ? <Navigate to="/login" /> :
              !isSubscribed ? <Navigate to="/subscription" /> :
              <Onboarding />
            } />

            <Route path="/pantry" element={
              !isAuthenticated ? <Navigate to="/login" /> :
              !isSubscribed ? <Navigate to="/subscription" /> :
              !isFullyOnboarded ? <Navigate to="/onboarding" /> :
              <Pantry />
            } />
            <Route path="/scan" element={
              !isAuthenticated ? <Navigate to="/login" /> :
              !isSubscribed ? <Navigate to="/subscription" /> :
              !isFullyOnboarded ? <Navigate to="/onboarding" /> :
              <MagicScan />
            } />
            <Route path="/cookbook" element={
              !isAuthenticated ? <Navigate to="/login" /> :
              !isSubscribed ? <Navigate to="/subscription" /> :
              !isFullyOnboarded ? <Navigate to="/onboarding" /> :
              <Cookbook />
            } />
            <Route path="/account" element={
              !isAuthenticated ? <Navigate to="/login" /> :
              !isSubscribed ? <Navigate to="/subscription" /> :
              !isFullyOnboarded ? <Navigate to="/onboarding" /> :
              <Account />
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
