import { useEffect, useRef, useCallback, useState } from 'react';

interface SessionTimeoutOptions {
    /**
     * Time in milliseconds before showing warning (default: 25 minutes)
     */
    warningTime?: number;
    /**
     * Time in milliseconds before auto-logout (default: 30 minutes)
     */
    logoutTime?: number;
    /**
     * Callback when warning should be shown
     */
    onWarning?: (remainingSeconds: number) => void;
    /**
     * Callback when user should be logged out
     */
    onLogout?: () => void;
    /**
     * Events that reset the timer
     */
    events?: string[];
}

interface SessionTimeoutState {
    isWarningVisible: boolean;
    remainingSeconds: number;
    extendSession: () => void;
}

/**
 * Hook to handle session timeout with warning before logout
 */
export const useSessionTimeout = (options: SessionTimeoutOptions = {}): SessionTimeoutState => {
    const {
        warningTime = 25 * 60 * 1000, // 25 minutes
        logoutTime = 30 * 60 * 1000,  // 30 minutes
        onWarning,
        onLogout,
        events = ['mousedown', 'keydown', 'scroll', 'touchstart'],
    } = options;

    const [isWarningVisible, setIsWarningVisible] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(0);

    const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
    const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    const clearAllTimers = useCallback(() => {
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
    }, []);

    const startCountdown = useCallback(() => {
        const logoutAt = lastActivityRef.current + logoutTime;

        countdownRef.current = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((logoutAt - Date.now()) / 1000));
            setRemainingSeconds(remaining);

            if (remaining <= 0) {
                clearAllTimers();
                setIsWarningVisible(false);
                onLogout?.();
            }
        }, 1000);
    }, [logoutTime, onLogout, clearAllTimers]);

    const resetTimers = useCallback(() => {
        clearAllTimers();
        lastActivityRef.current = Date.now();
        setIsWarningVisible(false);
        setRemainingSeconds(0);

        // Set warning timer
        warningTimerRef.current = setTimeout(() => {
            const remaining = Math.ceil((logoutTime - warningTime) / 1000);
            setRemainingSeconds(remaining);
            setIsWarningVisible(true);
            onWarning?.(remaining);
            startCountdown();
        }, warningTime);

        // Set logout timer
        logoutTimerRef.current = setTimeout(() => {
            clearAllTimers();
            setIsWarningVisible(false);
            onLogout?.();
        }, logoutTime);
    }, [warningTime, logoutTime, onWarning, onLogout, clearAllTimers, startCountdown]);

    const extendSession = useCallback(() => {
        resetTimers();
    }, [resetTimers]);

    useEffect(() => {
        // Start timers on mount
        resetTimers();

        // Add event listeners
        const handleActivity = () => {
            if (!isWarningVisible) {
                resetTimers();
            }
        };

        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        return () => {
            clearAllTimers();
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [events, resetTimers, clearAllTimers, isWarningVisible]);

    return {
        isWarningVisible,
        remainingSeconds,
        extendSession,
    };
};

/**
 * Format seconds to MM:SS
 */
export const formatTimeRemaining = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default useSessionTimeout;
