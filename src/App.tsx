import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import { ToastProvider } from './contexts/ToastContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { LoginPage } from './components/Auth/LoginPage';
import { LandingPage } from './components/LandingPage';
import { PWAPrompt, OfflineIndicator as PWAOfflineIndicator } from './components/PWAPrompt';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { ErrorBoundary } from '../components/ErrorBoundary';
import MainApp from '../App';
import { Loader2 } from 'lucide-react';

// Loading screen component
const LoadingScreen: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <div className="text-center">
      <img src="/tradesync-logo.jpg" alt="TradeSync" className="h-16 mx-auto mb-6 rounded-xl animate-pulse" />
      <Loader2 className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-4" />
      <p className="text-slate-400 text-sm font-medium">{message}</p>
    </div>
  </div>
);

// Data-aware app wrapper
const DataAwareApp: React.FC = () => {
  const { loading, error } = useData();

  if (loading) {
    return <LoadingScreen message="Loading your data..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <img src="/tradesync-logo.jpg" alt="TradeSync" className="h-16 mx-auto mb-6 rounded-xl" />
          <p className="text-red-400 mb-4">Failed to load data: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-teal-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
};

// Main view router - handles landing, login, and app views
type ViewState = 'landing' | 'login' | 'signup' | 'app';

const ViewRouter: React.FC = () => {
  const { user, loading } = useAuth();
  const [view, setView] = useState<ViewState>('landing');
  const [hasVisitedBefore, setHasVisitedBefore] = useState<boolean | null>(null);

  // Check if user has visited before (show landing or go straight to login)
  useEffect(() => {
    try {
      const visited = localStorage.getItem('tradesync_visited');
      setHasVisitedBefore(visited === 'true');
    } catch {
      setHasVisitedBefore(false);
    }
  }, []);

  // Mark as visited when they interact with landing
  const markVisited = () => {
    try {
      localStorage.setItem('tradesync_visited', 'true');
    } catch {
      // localStorage not available
    }
  };

  // Handle auth state changes
  useEffect(() => {
    if (user) {
      setView('app');
    }
  }, [user]);

  if (loading || hasVisitedBefore === null) {
    return <LoadingScreen />;
  }

  // If logged in, show the app
  if (user) {
    return (
      <OfflineProvider>
        <DataProvider>
          <DataAwareApp />
          <OfflineIndicator />
        </DataProvider>
      </OfflineProvider>
    );
  }

  // If on login/signup view, show login page
  if (view === 'login' || view === 'signup') {
    return (
      <LoginPage
        onBackToLanding={() => setView('landing')}
      />
    );
  }

  // Show landing page
  return (
    <LandingPage
      onLogin={() => {
        markVisited();
        setView('login');
      }}
      onSignUp={() => {
        markVisited();
        setView('signup');
      }}
    />
  );
};

// Main App with providers
const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <PWAOfflineIndicator />
        <ViewRouter />
        <PWAPrompt />
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
