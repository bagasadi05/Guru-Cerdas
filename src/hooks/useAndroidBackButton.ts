import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Handles Android hardware back button via Capacitor.
 * - On dashboard/home: exits the app
 * - Otherwise: navigates back in history
 * - Falls back to exit if no history
 */
export function useAndroidBackButton(): void {
  const navigate = useNavigate();

  useEffect(() => {
    const setupBackButton = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        const { App: CapApp } = await import('@capacitor/app');

        if (Capacitor.isNativePlatform()) {
          const listener = await CapApp.addListener('backButton', ({ canGoBack }) => {
            const currentPath = window.location.pathname;

            if (currentPath === '/' || currentPath === '/dashboard') {
              CapApp.exitApp();
            } else if (canGoBack || window.history.length > 1) {
              navigate(-1);
            } else {
              CapApp.exitApp();
            }
          });

          return () => {
            listener.remove();
          };
        }
      } catch {
        // Back button handler not available on this platform
      }
    };

    setupBackButton();
  }, [navigate]);
}
