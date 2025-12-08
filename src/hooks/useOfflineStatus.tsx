import { useState, useEffect } from 'react';

/**
 * Custom hook for monitoring the browser's online/offline status
 * 
 * Tracks the network connectivity status of the browser and provides real-time updates
 * when the connection state changes. This is useful for implementing offline-first features,
 * showing connectivity indicators, or disabling network-dependent features when offline.
 * 
 * The hook listens to the browser's 'online' and 'offline' events and updates the state accordingly.
 * On initial mount, it checks the current navigator.onLine status.
 * 
 * @returns Boolean indicating whether the browser is currently online (true) or offline (false)
 * 
 * @example
 * ```typescript
 * import { useOfflineStatus } from './hooks/useOfflineStatus';
 * 
 * function NetworkIndicator() {
 *   const isOnline = useOfflineStatus();
 * 
 *   return (
 *     <div>
 *       {isOnline ? (
 *         <span className="text-green-500">Connected</span>
 *       ) : (
 *         <span className="text-red-500">Offline</span>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Disable form submission when offline
 * function MyForm() {
 *   const isOnline = useOfflineStatus();
 * 
 *   const handleSubmit = (e) => {
 *     e.preventDefault();
 *     if (!isOnline) {
 *       alert('Cannot submit while offline');
 *       return;
 *     }
 *     // Submit form...
 *   };
 * 
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <button type="submit" disabled={!isOnline}>
 *         Submit
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 * 
 * @since 1.0.0
 */
export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
