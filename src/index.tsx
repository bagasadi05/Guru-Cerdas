import './styles/tailwind.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Import local fonts for offline support
import './styles/fonts.css';

// Import dev testing utilities (available in browser console during development)
import './utils/devTestUtils';

// Import mobile initialization for Capacitor
import { initializeMobile } from './services/mobileInit';

// Initialize mobile plugins (no-op on web)
initializeMobile();

import * as Sentry from "@sentry/react";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
const isProduction = import.meta.env.PROD;

// Only initialize Sentry in production to avoid ERR_BLOCKED_BY_CLIENT errors from ad blockers
if (sentryDsn && isProduction) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Tracing
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: ["localhost", "https://portal-guru.supabase.co"],
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
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
  let isReloadingForUpdate = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isReloadingForUpdate) return;
    isReloadingForUpdate = true;
    window.location.reload();
  });

  const updateSW = registerSW({
    onNeedRefresh() {
      console.log('New content available, reloading to apply update.');
      void updateSW(true);
    },
    onOfflineReady() {
      console.log('App is ready to work offline.');
    },
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


