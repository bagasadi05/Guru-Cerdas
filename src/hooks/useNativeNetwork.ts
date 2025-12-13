import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network, ConnectionStatus } from '@capacitor/network';

/**
 * Native network status hook using Capacitor Network plugin
 * Falls back to browser APIs when not running in native context
 */
export interface NetworkState {
    isConnected: boolean;
    connectionType: string;
    wasOffline: boolean;
}

export const useNativeNetwork = () => {
    const [state, setState] = useState<NetworkState>({
        isConnected: true,
        connectionType: 'unknown',
        wasOffline: false
    });

    const checkConnection = useCallback(async () => {
        if (Capacitor.isNativePlatform()) {
            try {
                const status = await Network.getStatus();
                setState(prev => ({
                    isConnected: status.connected,
                    connectionType: status.connectionType,
                    wasOffline: !status.connected ? true : prev.wasOffline
                }));
            } catch (error) {
                console.error('Error checking network status:', error);
            }
        } else {
            // Web fallback
            setState(prev => ({
                isConnected: navigator.onLine,
                connectionType: navigator.onLine ? 'wifi' : 'none',
                wasOffline: !navigator.onLine ? true : prev.wasOffline
            }));
        }
    }, []);

    useEffect(() => {
        // Initial check
        checkConnection();

        if (Capacitor.isNativePlatform()) {
            // Native listener
            const listener = Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
                console.log('Network status changed:', status);
                setState(prev => ({
                    isConnected: status.connected,
                    connectionType: status.connectionType,
                    wasOffline: !status.connected ? true : prev.wasOffline
                }));
            });

            return () => {
                listener.then(l => l.remove());
            };
        } else {
            // Web fallback listeners
            const handleOnline = () => {
                setState(prev => ({
                    ...prev,
                    isConnected: true,
                    connectionType: 'wifi'
                }));
            };

            const handleOffline = () => {
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
        }
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
