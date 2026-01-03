/**
 * Session Timeout Warning Component
 * 
 * Features:
 * - Countdown timer before logout
 * - Extend session option
 * - Graceful logout
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';
import { initSessionTimeout, extendSession } from '../../utils/security';

// ============================================
// SESSION TIMEOUT CONFIG
// ============================================

const DEFAULT_CONFIG = {
    // Session timeout: 30 minutes of inactivity
    timeoutMs: 30 * 60 * 1000,
    // Show warning 5 minutes before timeout
    warningMs: 25 * 60 * 1000,
};

// ============================================
// SESSION TIMEOUT WARNING MODAL
// ============================================

interface SessionTimeoutWarningProps {
    isOpen: boolean;
    remainingSeconds: number;
    onExtend: () => void;
    onLogout: () => void;
}

export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
    isOpen,
    remainingSeconds,
    onExtend,
    onLogout,
}) => {
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getProgressColor = (): string => {
        if (remainingSeconds > 180) return 'bg-amber-500';
        if (remainingSeconds > 60) return 'bg-orange-500';
        return 'bg-rose-500';
    };

    const maxSeconds = 5 * 60; // 5 minutes warning window
    const progressPercentage = Math.max(0, (remainingSeconds / maxSeconds) * 100);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onExtend}
            title=""
        >
            <div className="text-center py-4">
                {/* Icon */}
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Sesi Akan Berakhir
                </h3>

                {/* Description */}
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Anda akan keluar karena tidak ada aktivitas.
                    Klik "Tetap Login" untuk melanjutkan.
                </p>

                {/* Countdown */}
                <div className="mb-6">
                    <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2 font-mono">
                        {formatTime(remainingSeconds)}
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mx-auto max-w-xs">
                        <div
                            className={`h-full transition-all duration-1000 ${getProgressColor()}`}
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                        onClick={onExtend}
                        className="flex-1 sm:flex-none"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Tetap Login
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onLogout}
                        className="flex-1 sm:flex-none"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout Sekarang
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

// ============================================
// SESSION TIMEOUT PROVIDER
// ============================================

interface SessionTimeoutProviderProps {
    children: React.ReactNode;
    timeoutMs?: number;
    warningMs?: number;
    onTimeout: () => void;
    enabled?: boolean;
}

/**
 * Provider component that monitors session timeout
 */
export const SessionTimeoutProvider: React.FC<SessionTimeoutProviderProps> = ({
    children,
    timeoutMs = DEFAULT_CONFIG.timeoutMs,
    warningMs = DEFAULT_CONFIG.warningMs,
    onTimeout,
    enabled = true,
}) => {
    const [showWarning, setShowWarning] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(0);

    // Initialize session timeout
    useEffect(() => {
        if (!enabled) return;

        const cleanup = initSessionTimeout({
            timeoutMs,
            warningMs,
            onWarning: (remainingMs) => {
                setRemainingSeconds(Math.ceil(remainingMs / 1000));
                setShowWarning(true);
            },
            onTimeout: () => {
                setShowWarning(false);
                onTimeout();
            },
            onActivity: () => {
                // User is active, hide warning if visible
                if (showWarning) {
                    setShowWarning(false);
                }
            },
        });

        return cleanup;
    }, [enabled, timeoutMs, warningMs, onTimeout, showWarning]);

    // Countdown timer when warning is shown
    useEffect(() => {
        if (!showWarning || remainingSeconds <= 0) return;

        const timer = setInterval(() => {
            setRemainingSeconds((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [showWarning, remainingSeconds]);

    const handleExtend = useCallback(() => {
        extendSession();
        setShowWarning(false);
    }, []);

    const handleLogout = useCallback(() => {
        setShowWarning(false);
        onTimeout();
    }, [onTimeout]);

    return (
        <>
            {children}
            <SessionTimeoutWarning
                isOpen={showWarning}
                remainingSeconds={remainingSeconds}
                onExtend={handleExtend}
                onLogout={handleLogout}
            />
        </>
    );
};

// ============================================
// USE SESSION TIMEOUT HOOK
// ============================================

interface UseSessionTimeoutOptions {
    timeoutMs?: number;
    warningMs?: number;
    onWarning?: (remainingMs: number) => void;
    onTimeout?: () => void;
    enabled?: boolean;
}

/**
 * Hook for custom session timeout handling
 */
export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
    const {
        timeoutMs = DEFAULT_CONFIG.timeoutMs,
        warningMs = DEFAULT_CONFIG.warningMs,
        onWarning,
        onTimeout,
        enabled = true,
    } = options;

    const [isWarningShown, setIsWarningShown] = useState(false);
    const [remainingMs, setRemainingMs] = useState(0);

    useEffect(() => {
        if (!enabled) return;

        const cleanup = initSessionTimeout({
            timeoutMs,
            warningMs,
            onWarning: (remaining) => {
                setIsWarningShown(true);
                setRemainingMs(remaining);
                onWarning?.(remaining);
            },
            onTimeout: () => {
                setIsWarningShown(false);
                setRemainingMs(0);
                onTimeout?.();
            },
            onActivity: () => {
                setIsWarningShown(false);
            },
        });

        return cleanup;
    }, [enabled, timeoutMs, warningMs, onWarning, onTimeout]);

    const extend = useCallback(() => {
        extendSession();
        setIsWarningShown(false);
    }, []);

    return {
        isWarningShown,
        remainingMs,
        extend,
    };
}

export default {
    SessionTimeoutWarning,
    SessionTimeoutProvider,
    useSessionTimeout,
};
