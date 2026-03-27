import React, { useState, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import SubscriptionPage from './pages/SubscriptionPage';
import OnboardingPage from './pages/OnboardingPage';
import PantryPage from './pages/PantryPage';
import MagicScanPage from './pages/MagicScanPage';
import CookbookPage from './pages/CookbookPage';
import { AppContext } from './AppContext';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { isSubscribed } = useContext(AppContext);

  return (
    <Router>
      <div className="app-container">
        {isAuthenticated && <Navigation setIsAuthenticated={setIsAuthenticated} />}
        <main className="main-content">
          <Routes>
            <Route path="/" element={isAuthenticated ? <Navigate to="/pantry" /> : <Navigate to="/login" />} />
            
            <Route path="/login" element={<LoginPage setIsAuthenticated={setIsAuthenticated} />} />
            <Route path="/register" element={<RegisterPage setIsAuthenticated={setIsAuthenticated} />} />
            
            <Route path="/subscription" element={isAuthenticated ? (isSubscribed ? <Navigate to="/pantry" /> : <SubscriptionPage />) : <Navigate to="/login" />} />
            <Route path="/onboarding" element={isAuthenticated ? <OnboardingPage /> : <Navigate to="/login" />} />
            
            <Route path="/pantry" element={isAuthenticated ? (isSubscribed ? <PantryPage /> : <Navigate to="/subscription" />) : <Navigate to="/login" />} />
            <Route path="/scan" element={isAuthenticated ? (isSubscribed ? <MagicScanPage /> : <Navigate to="/subscription" />) : <Navigate to="/login" />} />
            <Route path="/cookbook" element={isAuthenticated ? (isSubscribed ? <CookbookPage /> : <Navigate to="/subscription" />) : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
