import './styles/tailwind.css';
import './styles/fluidDesign.css';

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
  let swRegistration: ServiceWorkerRegistration | undefined;

  const updateSW = registerSW({
    onNeedRefresh() {
      logger.info('New content available. Triggering smart update.', 'SW');
      // If the tab is currently in the background / hidden, reload immediately without waiting
      if (document.hidden) {
        logger.info('Tab is hidden, updating immediately in background.', 'SW');
        try {
          sessionStorage.setItem('post-reload-path', window.location.pathname + window.location.search);
        } catch {
          // ignore
        }
        void updateSW(true);
        return;
      }
      // Show auto-reboot countdown banner
      window.dispatchEvent(new CustomEvent('sw-update-available', { detail: { updateSW } }));
    },
    onOfflineReady() {
      logger.info('App is ready to work offline.', 'SW');
    },
    onRegistered(registration) {
      logger.info('Service Worker registered successfully.', 'SW');
      swRegistration = registration;
      if (registration) {
        // Immediate check on startup
        void registration.update();
      }
    },
    onRegisterError(error) {
      logger.error('Service Worker registration failed:', 'SW', error);
    }
  });

  // Check for updates periodically every 2 minutes
  const UPDATE_CHECK_INTERVAL = 2 * 60 * 1000;
  const intervalId = setInterval(() => {
    if (swRegistration) {
      logger.info('Checking for service worker updates...', 'SW');
      void swRegistration.update();
    }
  }, UPDATE_CHECK_INTERVAL);

  // Check for updates whenever user returns to the app / focuses the tab
  const handleTabFocus = () => {
    if (!document.hidden && swRegistration) {
      logger.info('Tab focused. Checking for service worker updates...', 'SW');
      void swRegistration.update();
    }
  };

  window.addEventListener('focus', handleTabFocus);
  document.addEventListener('visibilitychange', handleTabFocus);

  // Check for updates on route navigation
  window.addEventListener('app-check-sw-update', () => {
    if (swRegistration) {
      void swRegistration.update();
    }
  });

  window.addEventListener('beforeunload', () => {
    clearInterval(intervalId);
    window.removeEventListener('focus', handleTabFocus);
    document.removeEventListener('visibilitychange', handleTabFocus);
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


