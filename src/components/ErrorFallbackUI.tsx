import React, { useState, useEffect, useCallback } from 'react';
import {
    AppError,
    ErrorType,
    getUserMessage,
    isRetryable,
    attemptRecovery
} from '../services/errorHandling';

/**
 * Error Fallback UI Components
 * User-friendly error displays with recovery options
 */

// ============================================
// ERROR FALLBACK COMPONENT
// ============================================

interface ErrorFallbackProps {
    error: AppError | null;
    onRetry?: () => void;
    onDismiss?: () => void;
    onGoBack?: () => void;
    showDetails?: boolean;
    className?: string;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
    error,
    onRetry,
    onDismiss,
    onGoBack,
    showDetails = false,
    className = ''
}) => {
    if (!error) return null;

    const { title, message, action } = getUserMessage(error);

    const getIcon = () => {
        switch (error.type) {
            case ErrorType.NETWORK:
            case ErrorType.OFFLINE:
                return (
                    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                        />
                    </svg>
                );
            case ErrorType.AUTH:
                return (
                    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                    </svg>
                );
            case ErrorType.NOT_FOUND:
                return (
                    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                );
            case ErrorType.PERMISSION:
                return (
                    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                    </svg>
                );
            case ErrorType.SERVER:
                return (
                    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                        />
                    </svg>
                );
            default:
                return (
                    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                );
        }
    };

    const getColor = () => {
        switch (error.type) {
            case ErrorType.NETWORK:
            case ErrorType.OFFLINE:
            case ErrorType.TIMEOUT:
                return 'text-amber-500';
            case ErrorType.AUTH:
            case ErrorType.PERMISSION:
                return 'text-purple-500';
            case ErrorType.SERVER:
            case ErrorType.CLIENT:
                return 'text-red-500';
            case ErrorType.NOT_FOUND:
                return 'text-slate-400';
            default:
                return 'text-slate-500';
        }
    };

    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
            <div className={getColor()}>
                {getIcon()}
            </div>

            <h2 className="mt-6 text-xl font-semibold text-slate-900 dark:text-white">
                {title}
            </h2>

            <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-md">
                {message}
            </p>

            {showDetails && error.code && (
                <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
                    Kode Error: {error.code}
                </p>
            )}

            <div className="flex gap-3 mt-6">
                {onGoBack && (
                    <button
                        onClick={onGoBack}
                        className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        Kembali
                    </button>
                )}

                {isRetryable(error) && onRetry && (
                    <button
                        onClick={onRetry}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        {action}
                    </button>
                )}

                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        Tutup
                    </button>
                )}
            </div>

            {showDetails && error.stack && (
                <details className="mt-6 w-full max-w-lg text-left">
                    <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-600">
                        Detail Teknis
                    </summary>
                    <pre className="mt-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs overflow-x-auto">
                        {error.stack}
                    </pre>
                </details>
            )}
        </div>
    );
};

// ============================================
// INLINE ERROR DISPLAY
// ============================================

interface InlineErrorProps {
    error: AppError | string | null;
    onDismiss?: () => void;
    className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({
    error,
    onDismiss,
    className = ''
}) => {
    if (!error) return null;

    const message = typeof error === 'string' ? error : error.userMessage;

    return (
        <div className={`flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg ${className}`}>
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="flex-1 text-sm text-red-700 dark:text-red-300">{message}</p>
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className="text-red-400 hover:text-red-600 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    );
};

// ============================================
// LOADING FALLBACK
// ============================================

interface LoadingFallbackProps {
    message?: string;
    className?: string;
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
    message = 'Memuat...',
    className = ''
}) => {
    return (
        <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
            <div className="relative">
                <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-900 rounded-full"></div>
                <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">{message}</p>
        </div>
    );
};

// ============================================
// EMPTY STATE FALLBACK
// ============================================

interface EmptyFallbackProps {
    title?: string;
    message?: string;
    icon?: React.ReactNode;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export const EmptyFallback: React.FC<EmptyFallbackProps> = ({
    title = 'Tidak Ada Data',
    message = 'Belum ada data yang tersedia.',
    icon,
    action,
    className = ''
}) => {
    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
            <div className="text-slate-300 dark:text-slate-600">
                {icon || (
                    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                    </svg>
                )}
            </div>

            <h3 className="mt-4 text-lg font-medium text-slate-700 dark:text-slate-300">
                {title}
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {message}
            </p>

            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
};

// ============================================
// OFFLINE FALLBACK
// ============================================

interface OfflineFallbackProps {
    cachedAt?: Date;
    onRetry?: () => void;
    className?: string;
}

export const OfflineFallback: React.FC<OfflineFallbackProps> = ({
    cachedAt,
    onRetry,
    className = ''
}) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

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

    if (isOnline) return null;

    return (
        <div className={`p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl ${className}`}>
            <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                        />
                    </svg>
                </div>
                <div className="flex-1">
                    <h4 className="font-medium text-amber-900 dark:text-amber-200">
                        Anda Sedang Offline
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Menampilkan data tersimpan.
                        {cachedAt && (
                            <span className="block mt-0.5 text-amber-600 dark:text-amber-400">
                                Terakhir diperbarui: {cachedAt.toLocaleString('id-ID')}
                            </span>
                        )}
                    </p>
                </div>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="px-3 py-1.5 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors"
                    >
                        Coba Lagi
                    </button>
                )}
            </div>
        </div>
    );
};

// ============================================
// DATA FETCHER WITH FALLBACK
// ============================================

interface DataFetcherProps<T> {
    fetchFn: () => Promise<T>;
    fallbackData?: T;
    children: (data: T) => React.ReactNode;
    loadingComponent?: React.ReactNode;
    errorComponent?: React.ReactNode | ((error: AppError, retry: () => void) => React.ReactNode);
    emptyComponent?: React.ReactNode;
    isEmpty?: (data: T) => boolean;
    onError?: (error: AppError) => void;
    refetchInterval?: number;
}

export function DataFetcher<T>({
    fetchFn,
    fallbackData,
    children,
    loadingComponent,
    errorComponent,
    emptyComponent,
    isEmpty,
    onError,
    refetchInterval
}: DataFetcherProps<T>) {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<AppError | null>(null);
    const [loading, setLoading] = useState(true);

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await fetchFn();
            setData(result);
        } catch (e) {
            const appError = e as AppError;
            setError(appError);
            onError?.(appError);

            // Try recovery
            const { recovered } = await attemptRecovery(appError, {
                fallbackData,
                setData,
                retryFn: fetch
            });

            if (recovered && fallbackData) {
                setData(fallbackData);
            }
        } finally {
            setLoading(false);
        }
    }, [fetchFn, fallbackData, onError]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    useEffect(() => {
        if (refetchInterval) {
            const interval = setInterval(fetch, refetchInterval);
            return () => clearInterval(interval);
        }
    }, [fetch, refetchInterval]);

    const retry = useCallback(() => {
        fetch();
    }, [fetch]);

    if (loading) {
        return <>{loadingComponent || <LoadingFallback />}</>;
    }

    if (error) {
        if (typeof errorComponent === 'function') {
            return <>{errorComponent(error, retry)}</>;
        }
        return <>{errorComponent || <ErrorFallback error={error} onRetry={retry} />}</>;
    }

    if (data === null || (isEmpty && isEmpty(data))) {
        return <>{emptyComponent || <EmptyFallback />}</>;
    }

    return <>{children(data)}</>;
}

// ============================================
// EXPORTS
// ============================================

export default {
    ErrorFallback,
    InlineError,
    LoadingFallback,
    EmptyFallback,
    OfflineFallback,
    DataFetcher
};
