/**
 * Enhanced Error Display Components
 * 
 * User-friendly error handling UI with retry mechanism
 * and actionable error messages
 */

import React, { useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw, WifiOff, Clock, Lock, Server, FileQuestion, XCircle, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './Button';
import { parseError, type ActionableError } from '../../utils/errorMessages';
import { ErrorType } from '../../services/errorHandling';

// ============================================
// ERROR ICON MAPPING
// ============================================

const ErrorIcons: Record<string, React.FC<{ className?: string }>> = {
    NETWORK_ERROR: WifiOff,
    TIMEOUT: Clock,
    UNAUTHORIZED: Lock,
    FORBIDDEN: Lock,
    NOT_FOUND: FileQuestion,
    CONFLICT: RefreshCw,
    SERVER_ERROR: Server,
    OFFLINE: WifiOff,
    UNKNOWN: AlertTriangle,
};

// ============================================
// INLINE ERROR MESSAGE
// ============================================

interface InlineErrorProps {
    error: unknown;
    onRetry?: () => void;
    onDismiss?: () => void;
    className?: string;
}

/**
 * Inline error message component - shows user-friendly messages
 * Hides technical details from users
 */
export const InlineError: React.FC<InlineErrorProps> = ({
    error,
    onRetry,
    onDismiss,
    className = '',
}) => {
    const [showDetails, setShowDetails] = useState(false);
    const parsed = parseError(error);
    const Icon = ErrorIcons[parsed.title.toUpperCase().replace(/ /g, '_')] || AlertTriangle;

    const severityColors = {
        warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
        error: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200',
        info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    };

    return (
        <div className={`rounded-xl border p-4 ${severityColors[parsed.severity]} ${className}`}>
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm">{parsed.title}</h4>
                    <p className="text-sm mt-1 opacity-90">{parsed.message}</p>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-3">
                        {parsed.retryable && onRetry && (
                            <button
                                onClick={onRetry}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/50 dark:bg-black/20 rounded-lg text-sm font-medium hover:bg-white/80 dark:hover:bg-black/30 transition-colors"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                {parsed.actionLabel || 'Coba Lagi'}
                            </button>
                        )}
                        {onDismiss && (
                            <button
                                onClick={onDismiss}
                                className="px-3 py-1.5 text-sm opacity-70 hover:opacity-100 transition-opacity"
                            >
                                Tutup
                            </button>
                        )}
                    </div>

                    {/* Technical details (collapsible, dev mode only) */}
                    {import.meta.env.DEV && error instanceof Error && (
                        <div className="mt-3 pt-3 border-t border-current/10">
                            <button
                                onClick={() => setShowDetails(!showDetails)}
                                className="flex items-center gap-1 text-xs opacity-60 hover:opacity-80"
                            >
                                {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                Detail teknis
                            </button>
                            {showDetails && (
                                <pre className="mt-2 p-2 bg-black/10 dark:bg-white/10 rounded text-xs overflow-x-auto">
                                    {error.message}
                                </pre>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================
// RETRY BUTTON WITH AUTO-RETRY
// ============================================

interface RetryButtonProps {
    onRetry: () => Promise<void>;
    maxRetries?: number;
    retryDelay?: number;
    className?: string;
    children?: React.ReactNode;
}

/**
 * Button with auto-retry logic and exponential backoff
 */
export const RetryButton: React.FC<RetryButtonProps> = ({
    onRetry,
    maxRetries = 3,
    retryDelay = 1000,
    className = '',
    children = 'Coba Lagi',
}) => {
    const [isRetrying, setIsRetrying] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [countdown, setCountdown] = useState(0);

    const handleRetry = useCallback(async () => {
        if (isRetrying) return;

        setIsRetrying(true);
        setRetryCount(prev => prev + 1);

        try {
            await onRetry();
            setRetryCount(0);
        } catch {
            if (retryCount < maxRetries - 1) {
                // Show countdown for next retry
                const delay = retryDelay * Math.pow(2, retryCount);
                let remaining = Math.ceil(delay / 1000);
                setCountdown(remaining);

                const interval = setInterval(() => {
                    remaining -= 1;
                    setCountdown(remaining);
                    if (remaining <= 0) {
                        clearInterval(interval);
                        handleRetry();
                    }
                }, 1000);
            }
        } finally {
            setIsRetrying(false);
        }
    }, [isRetrying, retryCount, maxRetries, retryDelay, onRetry]);

    return (
        <Button
            onClick={handleRetry}
            disabled={isRetrying || countdown > 0}
            className={className}
        >
            {isRetrying ? (
                <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Mencoba...
                </>
            ) : countdown > 0 ? (
                <>
                    <Clock className="w-4 h-4 mr-2" />
                    Coba lagi dalam {countdown}s
                </>
            ) : (
                <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {children}
                    {retryCount > 0 && ` (${retryCount}/${maxRetries})`}
                </>
            )}
        </Button>
    );
};

// ============================================
// FULL PAGE ERROR
// ============================================

interface FullPageErrorProps {
    error: unknown;
    onRetry?: () => void;
    onGoHome?: () => void;
    showHomeButton?: boolean;
}

/**
 * Full page error display for critical failures
 */
export const FullPageError: React.FC<FullPageErrorProps> = ({
    error,
    onRetry,
    onGoHome,
    showHomeButton = true,
}) => {
    const parsed = parseError(error);
    const Icon = ErrorIcons[parsed.title.toUpperCase().replace(/ /g, '_')] || AlertTriangle;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
            <div className="max-w-md w-full text-center">
                {/* Icon */}
                <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center mb-6 shadow-lg shadow-rose-500/20">
                    <Icon className="w-10 h-10 text-white" />
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    {parsed.title}
                </h1>

                {/* Message */}
                <p className="text-slate-600 dark:text-slate-400 mb-8">
                    {parsed.message}
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    {parsed.retryable && onRetry && (
                        <Button onClick={onRetry} className="w-full sm:w-auto">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {parsed.actionLabel || 'Coba Lagi'}
                        </Button>
                    )}
                    {showHomeButton && onGoHome && (
                        <Button onClick={onGoHome} variant="outline" className="w-full sm:w-auto">
                            <Home className="w-4 h-4 mr-2" />
                            Kembali ke Beranda
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================
// TOAST ERROR (for react-hot-toast integration)
// ============================================

interface ToastErrorContent {
    title: string;
    message: string;
    onRetry?: () => void;
}

/**
 * Create toast-friendly error content
 */
export function createErrorToast(error: unknown, onRetry?: () => void): ToastErrorContent {
    const parsed = parseError(error);
    return {
        title: parsed.title,
        message: parsed.message,
        onRetry: parsed.retryable ? onRetry : undefined,
    };
}

// ============================================
// ERROR HANDLER HOOK
// ============================================

interface UseErrorHandlerOptions {
    onRetry?: () => Promise<void>;
    maxRetries?: number;
    autoRetry?: boolean;
    autoRetryDelay?: number;
}

interface UseErrorHandlerResult {
    error: ActionableError | null;
    setError: (error: unknown) => void;
    clearError: () => void;
    retry: () => Promise<void>;
    isRetrying: boolean;
    retryCount: number;
}

/**
 * Hook for handling errors with retry logic
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}): UseErrorHandlerResult {
    const {
        onRetry,
        maxRetries = 3,
        autoRetry = false,
        autoRetryDelay = 2000,
    } = options;

    const [error, setErrorState] = useState<ActionableError | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const setError = useCallback((err: unknown) => {
        const parsed = parseError(err);
        setErrorState(parsed);
        setRetryCount(0);

        // Auto-retry for network errors
        if (autoRetry && parsed.retryable && onRetry) {
            setTimeout(() => {
                retry();
            }, autoRetryDelay);
        }
    }, [autoRetry, autoRetryDelay, onRetry]);

    const clearError = useCallback(() => {
        setErrorState(null);
        setRetryCount(0);
    }, []);

    const retry = useCallback(async () => {
        if (!onRetry || isRetrying || retryCount >= maxRetries) return;

        setIsRetrying(true);
        setRetryCount(prev => prev + 1);

        try {
            await onRetry();
            clearError();
        } catch (err) {
            setErrorState(parseError(err));
        } finally {
            setIsRetrying(false);
        }
    }, [onRetry, isRetrying, retryCount, maxRetries, clearError]);

    return {
        error,
        setError,
        clearError,
        retry,
        isRetrying,
        retryCount,
    };
}

export default {
    InlineError,
    RetryButton,
    FullPageError,
    createErrorToast,
    useErrorHandler,
};
