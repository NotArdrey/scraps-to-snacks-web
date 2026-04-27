import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import Register from './pages/Register';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Subscription from './pages/Subscription';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import Onboarding from './pages/Onboarding';
import Pantry from './pages/Pantry';
import MagicScan from './pages/MagicScan';
import Cookbook from './pages/Cookbook';
import Account from './pages/Account';
import Admin from './pages/Admin';
import { AppContext } from './AppContextValue';
import './index.css';

function AppRoutes() {
  const { isAuthenticated, loading, hasActiveSubscription, subLoading, isOnboarded, profileLoading, isAdmin } = useContext(AppContext);
  const location = useLocation();

  if (loading || (isAuthenticated && (profileLoading || subLoading))) {
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
  const onAdminPage = location.pathname === '/admin';
  const loginRedirect = <Navigate to="/login" state={{ from: location }} replace />;

  const getDefaultRoute = () => {
    if (isAdmin) return '/admin';
    if (!isSubscribed) return '/subscription';
    if (!isFullyOnboarded) return '/onboarding';
    return '/pantry';
  };

  const getPostLoginRoute = () => {
    const from = location.state?.from;
    const fromPath = from?.pathname;
    const authPages = ['/login', '/register', '/reset-password'];

    if (fromPath && !authPages.includes(fromPath)) {
      return `${fromPath}${from.search ?? ''}${from.hash ?? ''}`;
    }

    return getDefaultRoute();
  };

  return (
    <div className={onAdminPage ? '' : 'app-container'}>
      {isAuthenticated && !isAdmin && isSubscribed && isFullyOnboarded && <Navigation />}

      <main className={onAdminPage ? '' : 'main-content'}>
        <Routes>
          <Route path="/" element={
            isAuthenticated ? <Navigate to={getDefaultRoute()} /> : <Navigate to="/login" />
          } />

          <Route path="/login" element={
            isAuthenticated ? <Navigate to={getPostLoginRoute()} replace /> : <Login />
          } />
          <Route path="/register" element={
            isAuthenticated ? <Navigate to={getDefaultRoute()} /> : <Register />
          } />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/subscription" element={
            !isAuthenticated ? loginRedirect :
            isAdmin ? <Navigate to="/admin" /> :
            <Subscription />
          } />
          <Route path="/payment/success" element={
            !isAuthenticated ? loginRedirect :
            isAdmin ? <Navigate to="/admin" /> :
            <PaymentSuccess />
          } />
          <Route path="/payment/cancel" element={
            !isAuthenticated ? loginRedirect :
            isAdmin ? <Navigate to="/admin" /> :
            <PaymentCancel />
          } />
          <Route path="/onboarding" element={
            !isAuthenticated ? loginRedirect :
            isAdmin ? <Navigate to="/admin" /> :
            !isSubscribed ? <Navigate to="/subscription" /> :
            <Onboarding />
          } />

          <Route path="/pantry" element={
            !isAuthenticated ? loginRedirect :
            isAdmin ? <Navigate to="/admin" /> :
            !isSubscribed ? <Navigate to="/subscription" /> :
            !isFullyOnboarded ? <Navigate to="/onboarding" /> :
            <Pantry />
          } />
          <Route path="/scan" element={
            !isAuthenticated ? loginRedirect :
            isAdmin ? <Navigate to="/admin" /> :
            !isSubscribed ? <Navigate to="/subscription" /> :
            !isFullyOnboarded ? <Navigate to="/onboarding" /> :
            <MagicScan />
          } />
          <Route path="/cookbook" element={
            !isAuthenticated ? loginRedirect :
            isAdmin ? <Navigate to="/admin" /> :
            !isSubscribed ? <Navigate to="/subscription" /> :
            !isFullyOnboarded ? <Navigate to="/onboarding" /> :
            <Cookbook />
          } />
          <Route path="/account" element={
            !isAuthenticated ? loginRedirect :
            isAdmin ? <Navigate to="/admin" /> :
            !isSubscribed ? <Navigate to="/subscription" /> :
            !isFullyOnboarded ? <Navigate to="/onboarding" /> :
            <Account />
          } />

          <Route path="/admin" element={
            !isAuthenticated ? loginRedirect :
            !isAdmin ? <Navigate to="/pantry" /> :
            <Admin />
          } />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
