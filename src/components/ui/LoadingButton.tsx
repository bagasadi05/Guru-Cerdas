/**
 * LoadingButton Component
 * Button with loading states and animations
 */

import React from 'react';
import { Button } from './Button';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    loadingText?: string;
    variant?: 'default' | 'destructive' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    icon?: React.ReactNode;
    successIcon?: React.ReactNode;
    isSuccess?: boolean;
}

// Animated Spinner SVG
const Spinner: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
    <svg
        className={`animate-spin ${className}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
    >
        <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
        />
        <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
    </svg>
);

// Animated Checkmark SVG
const Checkmark: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path
            d="M5 13l4 4L19 7"
            className="animate-draw-check"
            style={{
                strokeDasharray: 20,
                strokeDashoffset: 20,
                animation: 'draw-check 0.3s ease-out forwards',
            }}
        />
    </svg>
);

export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
    ({
        children,
        isLoading = false,
        loadingText,
        variant = 'default',
        size = 'default',
        icon,
        successIcon,
        isSuccess = false,
        disabled,
        className = '',
        ...props
    }, ref) => {
        const showLoading = isLoading && !isSuccess;
        const showSuccess = isSuccess;

        return (
            <Button
                ref={ref}
                variant={variant}
                size={size}
                disabled={disabled || isLoading}
                className={`
                    relative transition-all duration-300
                    ${showSuccess ? 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700' : ''}
                    ${className}
                `}
                {...props}
            >
                <span className={`flex items-center gap-2 transition-opacity duration-200 ${showLoading || showSuccess ? 'opacity-0' : 'opacity-100'}`}>
                    {icon}
                    {children}
                </span>

                {/* Loading State */}
                <span
                    className={`absolute inset-0 flex items-center justify-center gap-2 transition-opacity duration-200 ${showLoading ? 'opacity-100' : 'opacity-0'}`}
                >
                    <Spinner />
                    {loadingText && <span>{loadingText}</span>}
                </span>

                {/* Success State */}
                <span
                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${showSuccess ? 'opacity-100' : 'opacity-0'}`}
                >
                    {successIcon || <Checkmark className="w-5 h-5 text-white" />}
                </span>
            </Button>
        );
    }
);

LoadingButton.displayName = 'LoadingButton';

// Add the keyframe animation for the checkmark
const style = document.createElement('style');
style.textContent = `
    @keyframes draw-check {
        to {
            stroke-dashoffset: 0;
        }
    }
    .animate-draw-check {
        animation: draw-check 0.3s ease-out forwards;
    }
`;
if (typeof document !== 'undefined' && !document.querySelector('#loading-button-styles')) {
    style.id = 'loading-button-styles';
    document.head.appendChild(style);
}

export default LoadingButton;
