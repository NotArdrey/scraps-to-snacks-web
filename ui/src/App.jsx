import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import SubscriptionPage from './pages/SubscriptionPage';
import OnboardingPage from './pages/OnboardingPage';
import PantryPage from './pages/PantryPage';
import MagicScanPage from './pages/MagicScanPage';
import CookbookPage from './pages/CookbookPage';
import AccountPage from './pages/AccountPage';
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
              isAuthenticated ? <Navigate to={getDefaultRoute()} /> : <LoginPage />
            } />
            <Route path="/register" element={
              isAuthenticated ? <Navigate to={getDefaultRoute()} /> : <RegisterPage />
            } />

            <Route path="/subscription" element={
              !isAuthenticated ? <Navigate to="/login" /> :
              <SubscriptionPage />
            } />
            <Route path="/onboarding" element={
              !isAuthenticated ? <Navigate to="/login" /> :
              !isSubscribed ? <Navigate to="/subscription" /> :
              <OnboardingPage />
            } />

            <Route path="/pantry" element={
              !isAuthenticated ? <Navigate to="/login" /> :
              !isSubscribed ? <Navigate to="/subscription" /> :
              !isFullyOnboarded ? <Navigate to="/onboarding" /> :
              <PantryPage />
            } />
            <Route path="/scan" element={
              !isAuthenticated ? <Navigate to="/login" /> :
              !isSubscribed ? <Navigate to="/subscription" /> :
              !isFullyOnboarded ? <Navigate to="/onboarding" /> :
              <MagicScanPage />
            } />
            <Route path="/cookbook" element={
              !isAuthenticated ? <Navigate to="/login" /> :
              !isSubscribed ? <Navigate to="/subscription" /> :
              !isFullyOnboarded ? <Navigate to="/onboarding" /> :
              <CookbookPage />
            } />
            <Route path="/account" element={
              !isAuthenticated ? <Navigate to="/login" /> :
              !isSubscribed ? <Navigate to="/subscription" /> :
              !isFullyOnboarded ? <Navigate to="/onboarding" /> :
              <AccountPage />
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
