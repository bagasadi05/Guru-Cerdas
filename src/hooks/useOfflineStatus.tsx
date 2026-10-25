import { useState, useEffect } from 'react';
import { networkConnectivity } from '../services/networkConnectivity';

/**
 * Custom hook for monitoring the browser's online/offline status
 * 
 * Tracks real network connectivity status with Lie-Fi protection
 * (verifies actual HTTP WAN reachability when connected to Wi-Fi/cellular).
 * 
 * @returns Boolean indicating whether the browser is currently online (true) or offline (false)
 * 
 * @example
 * ```typescript
 * import { useOfflineStatus } from './hooks/useOfflineStatus';
 * 
 * function NetworkIndicator() {
 *   const isOnline = useOfflineStatus();
 *   return <span>{isOnline ? 'Online' : 'Offline'}</span>;
 * }
 * ```
 * 
 * @since 1.0.0
 */
export const useOfflineStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState<boolean>(() => networkConnectivity.isOnline());

  useEffect(() => {
    return networkConnectivity.subscribe(setIsOnline);
  }, []);

  return isOnline;
};

export default useOfflineStatus;
