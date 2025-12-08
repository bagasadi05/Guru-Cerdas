import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

/**
 * A reusable empty state component for when lists or sections have no data.
 * Provides a consistent visual treatment with optional action button.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    className = '',
}) => {
    return (
        <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
            {/* Animated Icon Container */}
            {icon && (
                <div className="relative mb-6">
                    {/* Background glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-2xl scale-150" />
                    {/* Icon container */}
                    <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center shadow-lg border border-slate-200 dark:border-slate-700">
                        <div className="text-slate-400 dark:text-slate-500">
                            {icon}
                        </div>
                    </div>
                </div>
            )}

            {/* Title */}
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
                {title}
            </h3>

            {/* Description */}
            {description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                    {description}
                </p>
            )}

            {/* Action Button */}
            {actionLabel && onAction && (
                <Button
                    onClick={onAction}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25"
                >
                    {actionLabel}
                </Button>
            )}
        </div>
    );
};

export default EmptyState;
