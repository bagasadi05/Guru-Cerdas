import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Import local fonts for offline support
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/tinos/400.css';
import '@fontsource/tinos/700.css';

// Import dev testing utilities (available in browser console during development)
import './utils/devTestUtils';

// Import mobile initialization for Capacitor
import { initializeMobile } from './services/mobileInit';

// Initialize mobile plugins (no-op on web)
initializeMobile();

// Register Service Worker for PWA
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content available, click on reload button to update.');
  },
  onOfflineReady() {
    console.log('App is ready to work offline.');
  },
});

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


