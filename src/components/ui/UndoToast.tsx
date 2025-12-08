/**
 * UndoToast Component
 * 
 * A toast notification with undo button and countdown timer.
 * Integrates with UndoManager for action reversal.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, RotateCcw, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { undo, getUndoTimeRemaining, canUndo } from '../../services/UndoManager';

interface UndoToastProps {
    actionId: string;
    message: string;
    duration?: number; // in milliseconds
    onDismiss: () => void;
    onUndo?: () => void;
    type?: 'delete' | 'update' | 'info';
}

export const UndoToast: React.FC<UndoToastProps> = ({
    actionId,
    message,
    duration = 10000,
    onDismiss,
    onUndo,
    type = 'delete',
}) => {
    const [timeRemaining, setTimeRemaining] = useState(duration);
    const [isUndoing, setIsUndoing] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    // Animate in
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 50);
        return () => clearTimeout(timer);
    }, []);

    // Countdown timer
    useEffect(() => {
        const interval = setInterval(() => {
            const remaining = getUndoTimeRemaining(actionId);
            setTimeRemaining(remaining);

            if (remaining <= 0) {
                handleDismiss();
            }
        }, 100);

        return () => clearInterval(interval);
    }, [actionId]);

    const handleDismiss = useCallback(() => {
        setIsExiting(true);
        setTimeout(() => {
            onDismiss();
        }, 300);
    }, [onDismiss]);

    const handleUndo = useCallback(async () => {
        if (isUndoing || !canUndo(actionId)) return;

        setIsUndoing(true);
        const result = await undo(actionId);

        if (result.success) {
            onUndo?.();
            handleDismiss();
        } else {
            console.error('Undo failed:', result.error);
            setIsUndoing(false);
        }
    }, [actionId, isUndoing, onUndo, handleDismiss]);

    // Handle keyboard shortcut (Ctrl+Z)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                handleUndo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo]);

    const progress = (timeRemaining / duration) * 100;
    const secondsRemaining = Math.ceil(timeRemaining / 1000);

    const getIcon = () => {
        switch (type) {
            case 'delete':
                return <Trash2 className="w-5 h-5" />;
            case 'update':
                return <CheckCircle className="w-5 h-5" />;
            default:
                return <AlertCircle className="w-5 h-5" />;
        }
    };

    const getColors = () => {
        switch (type) {
            case 'delete':
                return {
                    bg: 'bg-slate-900',
                    border: 'border-slate-700',
                    icon: 'text-red-400 bg-red-500/10',
                    progress: 'bg-red-500',
                };
            case 'update':
                return {
                    bg: 'bg-slate-900',
                    border: 'border-slate-700',
                    icon: 'text-blue-400 bg-blue-500/10',
                    progress: 'bg-blue-500',
                };
            default:
                return {
                    bg: 'bg-slate-900',
                    border: 'border-slate-700',
                    icon: 'text-slate-400 bg-slate-500/10',
                    progress: 'bg-slate-500',
                };
        }
    };

    const colors = getColors();

    return (
        <div
            role="alert"
            aria-live="polite"
            aria-atomic="true"
            className={`
                fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-50
                w-[90%] max-w-md
                ${colors.bg} ${colors.border} border
                rounded-2xl shadow-2xl overflow-hidden
                transition-all duration-300 ease-out
                ${isVisible && !isExiting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}
        >
            {/* Progress bar */}
            <div className="h-1 bg-slate-800 overflow-hidden">
                <div
                    className={`h-full ${colors.progress} transition-all duration-100 ease-linear`}
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="p-4">
                <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.icon}`}>
                        {getIcon()}
                    </div>

                    {/* Message */}
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-medium">{message}</p>
                        <p className="text-slate-400 text-sm">
                            {secondsRemaining > 0
                                ? `${secondsRemaining} detik tersisa untuk membatalkan`
                                : 'Tidak dapat dibatalkan'
                            }
                        </p>
                    </div>

                    {/* Undo button */}
                    <button
                        onClick={handleUndo}
                        disabled={isUndoing || timeRemaining <= 0}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-xl
                            font-medium text-sm transition-all
                            ${isUndoing || timeRemaining <= 0
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                            }
                        `}
                        aria-label="Batalkan aksi"
                    >
                        <RotateCcw className={`w-4 h-4 ${isUndoing ? 'animate-spin' : ''}`} />
                        {isUndoing ? 'Membatalkan...' : 'Undo'}
                    </button>

                    {/* Close button */}
                    <button
                        onClick={handleDismiss}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        aria-label="Tutup"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Keyboard hint */}
            <div className="px-4 pb-3 -mt-1">
                <span className="text-xs text-slate-500">
                    Tekan <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Ctrl+Z</kbd> untuk membatalkan
                </span>
            </div>
        </div>
    );
};

// Hook for managing undo toasts
interface UndoToastState {
    actionId: string;
    message: string;
    type: 'delete' | 'update' | 'info';
    duration: number;
}

export const useUndoToast = () => {
    const [toast, setToast] = useState<UndoToastState | null>(null);
    const [onUndoCallback, setOnUndoCallback] = useState<(() => void) | null>(null);

    const showUndoToast = useCallback((
        actionId: string,
        message: string,
        type: 'delete' | 'update' | 'info' = 'delete',
        duration: number = 10000,
        onUndo?: () => void
    ) => {
        setToast({ actionId, message, type, duration });
        if (onUndo) {
            setOnUndoCallback(() => onUndo);
        }
    }, []);

    const hideUndoToast = useCallback(() => {
        setToast(null);
        setOnUndoCallback(null);
    }, []);

    const UndoToastComponent = toast ? (
        <UndoToast
            actionId={toast.actionId}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onDismiss={hideUndoToast}
            onUndo={onUndoCallback || undefined}
        />
    ) : null;

    return {
        showUndoToast,
        hideUndoToast,
        UndoToastComponent,
    };
};

// Context for global undo toast management
import { createContext, useContext } from 'react';

interface UndoToastContextValue {
    showUndoToast: (
        actionId: string,
        message: string,
        type?: 'delete' | 'update' | 'info',
        duration?: number,
        onUndo?: () => void
    ) => void;
    hideUndoToast: () => void;
}

const UndoToastContext = createContext<UndoToastContextValue | null>(null);

export const UndoToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { showUndoToast, hideUndoToast, UndoToastComponent } = useUndoToast();

    return (
        <UndoToastContext.Provider value={{ showUndoToast, hideUndoToast }}>
            {children}
            {UndoToastComponent}
        </UndoToastContext.Provider>
    );
};

export const useUndoToastContext = () => {
    const context = useContext(UndoToastContext);
    if (!context) {
        throw new Error('useUndoToastContext must be used within UndoToastProvider');
    }
    return context;
};

export default UndoToast;
