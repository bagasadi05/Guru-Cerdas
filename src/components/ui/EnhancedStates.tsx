/**
 * Enhanced Error State Component
 * 
 * User-friendly error display with retry functionality
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '../ui/Button';

interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    onGoHome?: () => void;
    showHomeButton?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
    title = 'Terjadi Kesalahan',
    message = 'Maaf, terjadi kesalahan saat memuat data. Silakan coba lagi.',
    onRetry,
    onGoHome,
    showHomeButton = true,
}) => {
    return (
        <div
            className="flex flex-col items-center justify-center min-h-[400px] p-8"
            role="alert"
            aria-live="assertive"
        >
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-6">
                <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {title}
            </h2>

            <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
                {message}
            </p>

            <div className="flex gap-3">
                {onRetry && (
                    <Button
                        onClick={onRetry}
                        variant="primary"
                        className="flex items-center gap-2"
                        aria-label="Coba lagi memuat data"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Coba Lagi
                    </Button>
                )}

                {showHomeButton && onGoHome && (
                    <Button
                        onClick={onGoHome}
                        variant="outline"
                        className="flex items-center gap-2"
                        aria-label="Kembali ke halaman utama"
                    >
                        <Home className="w-4 h-4" />
                        Ke Beranda
                    </Button>
                )}
            </div>
        </div>
    );
};

/**
 * Empty State Component
 * 
 * For when there's no data to display
 */

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const EnhancedEmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    actionLabel,
    onAction,
}) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
            {icon && (
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    {icon}
                </div>
            )}

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {title}
            </h3>

            <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
                {description}
            </p>

            {actionLabel && onAction && (
                <Button onClick={onAction} variant="primary">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
};
