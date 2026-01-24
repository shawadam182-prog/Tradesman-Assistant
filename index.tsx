import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './src/App';

// Initialize Sentry for production error tracking
// Only enabled in production to avoid noise during development
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Sample 10% of transactions for performance monitoring (cost-effective)
    tracesSampleRate: 0.1,
    // Only send errors in production
    enabled: import.meta.env.PROD,
    // Don't send PII
    sendDefaultPii: false,
    // Environment tag for filtering in Sentry dashboard
    environment: import.meta.env.MODE,
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
