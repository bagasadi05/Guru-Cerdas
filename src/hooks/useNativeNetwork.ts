import { useState, useEffect, useCallback } from 'react';
import { networkConnectivity, type ConnectionType } from '../services/networkConnectivity';

/**
 * Network status hook for PWA / web browsers.
 * Uses networkConnectivity service with Lie-Fi protection.
 */
export interface NetworkState {
    isConnected: boolean;
    connectionType: ConnectionType;
    wasOffline: boolean;
}

export const useNativeNetwork = () => {
    const [state, setState] = useState<NetworkState>(() => {
        const isOnline = networkConnectivity.isOnline();
        return {
            isConnected: isOnline,
            connectionType: networkConnectivity.getConnectionType(),
            wasOffline: !isOnline,
        };
    });

    const checkConnection = useCallback(() => {
        void networkConnectivity.checkConnectivity(true);
    }, []);

    useEffect(() => {
        const unsubscribe = networkConnectivity.subscribe((online) => {
            setState((prev) => ({
                isConnected: online,
                connectionType: networkConnectivity.getConnectionType(),
                wasOffline: !online ? true : prev.wasOffline,
            }));
        });

        return unsubscribe;
    }, []);

    // Reset wasOffline 5 seconds after reconnection
    useEffect(() => {
        if (state.isConnected && state.wasOffline) {
            const timer = setTimeout(() => {
                setState((prev) => ({ ...prev, wasOffline: false }));
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [state.isConnected, state.wasOffline]);

    return {
        ...state,
        refresh: checkConnection,
    };
};

export default useNativeNetwork;
