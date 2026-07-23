import './styles/tailwind.css';

// Polyfill crypto.randomUUID for non-secure contexts (e.g. LAN IP)
if (typeof crypto === 'undefined') {
  (window as any).crypto = {};
}
if (typeof crypto.randomUUID !== 'function') {
  crypto.randomUUID = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }) as `${string}-${string}-${string}-${string}-${string}`;
  };
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';
import { logger } from './services/logger';

// Import local fonts for offline support
import './styles/fonts.css';
import './i18n';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
const isProduction = import.meta.env.PROD;
const isValidSentryDsn = typeof sentryDsn === 'string' && sentryDsn.startsWith('https://') && !sentryDsn.includes('your-');

// Dynamic import saves 268K from critical path — Sentry only needed in production with a valid DSN
if (isValidSentryDsn && isProduction) {
  void import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: sentryDsn,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      tracesSampleRate: 0.1,
      tracePropagationTargets: ["localhost", "https://portal-guru.supabase.co"],
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  });
}


if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      void registration.unregister();
    });
  });

  if ('caches' in window) {
    void caches.keys().then((keys) => {
      keys.forEach((key) => {
        void caches.delete(key);
      });
    });
  }
}

// Register Service Worker for PWA
if (isProduction) {
  const updateSW = registerSW({
    onNeedRefresh() {
      logger.info('New content available. Prompting user to update.', 'SW');
      // Show a non-intrusive banner rather than force-reloading mid-task.
      // We dispatch a custom event so any mounted component can react to it.
      window.dispatchEvent(new CustomEvent('sw-update-available', { detail: { updateSW } }));
    },
    onOfflineReady() {
      logger.info('App is ready to work offline.', 'SW');
    },
  });

  // Check for service worker updates every hour to keep long-open tabs up-to-date
  const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;
  const intervalId = setInterval(() => {
    logger.info('Checking for service worker updates...', 'SW');
    void updateSW();
  }, UPDATE_CHECK_INTERVAL);

  window.addEventListener('beforeunload', () => {
    clearInterval(intervalId);
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


