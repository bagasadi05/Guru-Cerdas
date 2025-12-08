import React from 'react';
import { Button } from './Button';
import {
    AlertTriangleIcon,
    AlertCircleIcon,
    XCircleIcon,
    RefreshCwIcon
} from '../Icons';
import { parseError, ActionableError } from '../../utils/errorMessages';

// Add RefreshCw to Icons if not exists
// Using custom simple refresh icon inline if needed

interface ErrorDisplayProps {
    error: unknown;
    onRetry?: () => void;
    onRefresh?: () => void;
    onLogin?: () => void;
    onDismiss?: () => void;
    compact?: boolean;
    className?: string;
}

/**
 * Display actionable error messages with retry options
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
    error,
    onRetry,
    onRefresh,
    onLogin,
    onDismiss,
    compact = false,
    className = '',
}) => {
    const actionableError = parseError(error);

    const handleAction = () => {
        switch (actionableError.action) {
            case 'retry':
                onRetry?.();
                break;
            case 'refresh':
                onRefresh?.() ?? window.location.reload();
                break;
            case 'login':
                onLogin?.() ?? (window.location.href = '/login');
                break;
            default:
                onDismiss?.();
        }
    };

    const severityStyles = {
        error: {
            bg: 'bg-red-50 dark:bg-red-900/20',
            border: 'border-red-200 dark:border-red-800',
            icon: 'text-red-500',
            title: 'text-red-800 dark:text-red-200',
            message: 'text-red-600 dark:text-red-300',
        },
        warning: {
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            border: 'border-amber-200 dark:border-amber-800',
            icon: 'text-amber-500',
            title: 'text-amber-800 dark:text-amber-200',
            message: 'text-amber-600 dark:text-amber-300',
        },
        info: {
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            border: 'border-blue-200 dark:border-blue-800',
            icon: 'text-blue-500',
            title: 'text-blue-800 dark:text-blue-200',
            message: 'text-blue-600 dark:text-blue-300',
        },
    };

    const styles = severityStyles[actionableError.severity];

    const Icon = actionableError.severity === 'error'
        ? XCircleIcon
        : actionableError.severity === 'warning'
            ? AlertTriangleIcon
            : AlertCircleIcon;

    if (compact) {
        return (
            <div className={`flex items-center gap-3 p-3 rounded-lg ${styles.bg} ${styles.border} border ${className}`}>
                <Icon className={`w-5 h-5 flex-shrink-0 ${styles.icon}`} />
                <div className="flex-grow min-w-0">
                    <p className={`text-sm font-medium truncate ${styles.title}`}>
                        {actionableError.title}
                    </p>
                </div>
                {actionableError.action && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleAction}
                        className={`flex-shrink-0 ${styles.title}`}
                    >
                        {actionableError.actionLabel || 'Coba Lagi'}
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className={`p-4 rounded-xl ${styles.bg} ${styles.border} border ${className}`}>
            <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${styles.bg}`}>
                    <Icon className={`w-6 h-6 ${styles.icon}`} />
                </div>
                <div className="flex-grow space-y-2">
                    <h4 className={`font-bold ${styles.title}`}>
                        {actionableError.title}
                    </h4>
                    <p className={`text-sm ${styles.message}`}>
                        {actionableError.message}
                    </p>

                    {actionableError.action && (
                        <div className="flex items-center gap-2 pt-2">
                            <Button
                                onClick={handleAction}
                                size="sm"
                                className={`
                                    ${actionableError.severity === 'error'
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : actionableError.severity === 'warning'
                                            ? 'bg-amber-600 hover:bg-amber-700'
                                            : 'bg-blue-600 hover:bg-blue-700'
                                    } text-white
                                `}
                            >
                                {actionableError.retryable && (
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                )}
                                {actionableError.actionLabel || 'Coba Lagi'}
                            </Button>
                            {onDismiss && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onDismiss}
                                    className="text-gray-500"
                                >
                                    Tutup
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Inline error message for form fields
 */
export const InlineError: React.FC<{
    message: string;
    className?: string;
}> = ({ message, className = '' }) => (
    <p className={`text-sm text-red-500 dark:text-red-400 mt-1 flex items-center gap-1 ${className}`}>
        <AlertCircleIcon className="w-3.5 h-3.5" />
        {message}
    </p>
);

/**
 * Error boundary fallback component
 */
export const ErrorFallback: React.FC<{
    error: Error;
    resetErrorBoundary?: () => void;
}> = ({ error, resetErrorBoundary }) => (
    <div className="min-h-[200px] flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <XCircleIcon className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Terjadi Kesalahan
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
                {error.message || 'Aplikasi mengalami kesalahan yang tidak terduga.'}
            </p>
            {resetErrorBoundary && (
                <Button onClick={resetErrorBoundary} className="mx-auto">
                    Coba Lagi
                </Button>
            )}
        </div>
    </div>
);

export default ErrorDisplay;
