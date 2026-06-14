import { useState, useEffect, useCallback } from 'react';
import { logger } from '../services/logger';

/**
 * Network status hook for PWA / web browsers.
 * Uses browser online/offline events and navigator.onLine.
 */
export interface NetworkState {
    isConnected: boolean;
    connectionType: string;
    wasOffline: boolean;
}

export const useNativeNetwork = () => {
    const [state, setState] = useState<NetworkState>(() => {
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        return {
            isConnected: isOnline,
            connectionType: isOnline ? 'wifi' : 'none',
            wasOffline: !isOnline
        };
    });

    const checkConnection = useCallback(() => {
        const isOnline = navigator.onLine;
        setState(prev => ({
            isConnected: isOnline,
            connectionType: isOnline ? 'wifi' : 'none',
            wasOffline: !isOnline ? true : prev.wasOffline
        }));
    }, []);

    useEffect(() => {

        const handleOnline = () => {
            logger.info('Network status changed', 'Network', { connected: true });
            setState(prev => ({
                ...prev,
                isConnected: true,
                connectionType: 'wifi'
            }));
        };

        const handleOffline = () => {
            logger.info('Network status changed', 'Network', { connected: false });
            setState(prev => ({
                ...prev,
                isConnected: false,
                connectionType: 'none',
                wasOffline: true
            }));
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [checkConnection]);

    // Reset wasOffline after reconnection
    useEffect(() => {
        if (state.isConnected && state.wasOffline) {
            const timer = setTimeout(() => {
                setState(prev => ({ ...prev, wasOffline: false }));
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [state.isConnected, state.wasOffline]);

    return {
        ...state,
        refresh: checkConnection
    };
};

export default useNativeNetwork;
