/**
 * Mobile UX Utilities
 * 
 * This file provides hooks and components for improving mobile experience:
 * - Keyboard handling (prevent content from being covered)
 * - Touch target sizing
 * - Loading state management
 * - Pull to refresh
 */

import React, { useEffect, useState, useCallback } from 'react';

// ============================================
// KEYBOARD HANDLING HOOK
// ============================================

import { useKeyboardAwareness as useCentralKeyboardAwareness } from '../hooks/useKeyboardAwareness';

interface KeyboardDimensions {
    isKeyboardVisible: boolean;
    keyboardHeight: number;
}

/**
 * Hook to detect virtual keyboard visibility and adjust content accordingly
 * Delegated to central useKeyboardAwareness hook for reliability and to avoid duplication.
 */
export function useKeyboardAwareness(): KeyboardDimensions {
    const keyboard = useCentralKeyboardAwareness();
    return {
        isKeyboardVisible: keyboard.isVisible,
        keyboardHeight: keyboard.height,
    };
}

// ============================================
// KEYBOARD AWARE CONTAINER
// ============================================

interface KeyboardAwareContainerProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * Container that adjusts padding when keyboard is visible
 */
export const KeyboardAwareContainer: React.FC<KeyboardAwareContainerProps> = ({
    children,
    className = '',
}) => {
    const { isKeyboardVisible, keyboardHeight } = useKeyboardAwareness();

    return (
        <div
            className={`transition-all duration-300 ${className}`}
            style={{
                paddingBottom: isKeyboardVisible ? `${keyboardHeight}px` : undefined,
            }}
        >
            {children}
        </div>
    );
};

// ============================================
// TOUCH TARGET WRAPPER
// ============================================

interface TouchTargetProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    minSize?: number;
    as?: 'button' | 'div' | 'a';
    href?: string;
    disabled?: boolean;
    ariaLabel?: string;
}

/**
 * Wrapper to ensure minimum touch target size of 48px (Material Design 3)
 */
export const TouchTarget: React.FC<TouchTargetProps> = ({
    children,
    onClick,
    className = '',
    minSize = 48,
    as = 'button',
    href,
    disabled = false,
    ariaLabel,
}) => {
    const baseStyles: React.CSSProperties = {
        minWidth: `${minSize}px`,
        minHeight: `${minSize}px`,
        touchAction: 'manipulation',
    };

    const Component = as;

    if (as === 'a' && href) {
        return (
            <a
                href={href}
                className={`inline-flex items-center justify-center active:scale-[0.95] transition-transform duration-150 ${className}`}
                style={baseStyles}
                aria-label={ariaLabel}
            >
                {children}
            </a>
        );
    }

    return (
        <Component
            onClick={disabled ? undefined : onClick}
            className={`inline-flex items-center justify-center active:scale-[0.95] transition-transform duration-150 ${className}`}
            style={baseStyles}
            disabled={disabled}
            aria-label={ariaLabel}
            type={as === 'button' ? 'button' : undefined}
        >
            {children}
        </Component>
    );
};

// ============================================
// LOADING STATES CONTEXT
// ============================================

interface LoadingState {
    key: string;
    isLoading: boolean;
    message?: string;
}

interface LoadingContextType {
    loadingStates: Map<string, LoadingState>;
    setLoading: (key: string, isLoading: boolean, message?: string) => void;
    isAnyLoading: () => boolean;
    getLoadingMessage: (key: string) => string | undefined;
}

const LoadingContext = React.createContext<LoadingContextType | null>(null);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [loadingStates, setLoadingStates] = useState<Map<string, LoadingState>>(new Map());

    const setLoading = useCallback((key: string, isLoading: boolean, message?: string) => {
        setLoadingStates(prev => {
            const newMap = new Map(prev);
            if (isLoading) {
                newMap.set(key, { key, isLoading, message });
            } else {
                newMap.delete(key);
            }
            return newMap;
        });
    }, []);

    const isAnyLoading = useCallback(() => {
        return loadingStates.size > 0;
    }, [loadingStates]);

    const getLoadingMessage = useCallback((key: string) => {
        return loadingStates.get(key)?.message;
    }, [loadingStates]);

    return (
        <LoadingContext.Provider value={{ loadingStates, setLoading, isAnyLoading, getLoadingMessage }}>
            {children}
        </LoadingContext.Provider>
    );
};

export const useLoading = () => {
    const context = React.useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
};

// ============================================
// INLINE LOADING INDICATOR
// ============================================

interface InlineLoadingProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
    className?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
    size = 'md',
    text,
    className = '',
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
    };

    return (
        <div className={`inline-flex items-center gap-2 ${className}`}>
            <svg
                className={`animate-spin ${sizeClasses[size]} text-indigo-600 dark:text-indigo-400`}
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
            {text && (
                <span className="text-sm text-slate-600 dark:text-slate-400">{text}</span>
            )}
        </div>
    );
};

// ============================================
// BUTTON WITH LOADING STATE
// ============================================

interface LoadingButtonProps {
    children: React.ReactNode;
    isLoading?: boolean;
    loadingText?: string;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
    children,
    isLoading = false,
    loadingText = 'Memproses...',
    onClick,
    disabled = false,
    className = '',
    type = 'button',
    variant = 'primary',
}) => {
    const variantClasses = {
        primary: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25',
        secondary: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700',
        ghost: 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
        destructive: 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/25',
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isLoading || disabled}
            className={`
                inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium
                transition-all duration-300 min-h-[48px]
                disabled:opacity-50 disabled:cursor-not-allowed
                ${variantClasses[variant]}
                ${className}
            `}
            style={{ touchAction: 'manipulation' }}
        >
            {isLoading ? (
                <>
                    <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
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
                    {loadingText}
                </>
            ) : (
                children
            )}
        </button>
    );
};

// ============================================
// SCROLL LOCK UTILITY
// ============================================

let scrollLockCount = 0;
let originalBodyOverflow = '';
let originalBodyPaddingRight = '';

export const lockScroll = () => {
    if (scrollLockCount === 0) {
        originalBodyOverflow = document.body.style.overflow;
        originalBodyPaddingRight = document.body.style.paddingRight;

        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    scrollLockCount++;
};

export const unlockScroll = () => {
    scrollLockCount--;
    if (scrollLockCount <= 0) {
        scrollLockCount = 0;
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.paddingRight = originalBodyPaddingRight;
    }
};

// ============================================
// SAFE AREA INSETS HOOK
// ============================================

interface SafeAreaInsets {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export function useSafeAreaInsets(): SafeAreaInsets {
    const [insets, setInsets] = useState<SafeAreaInsets>({
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    });

    useEffect(() => {
        const measureInsets = () => {
            // Create a temporary element to measure safe area insets
            const el = document.createElement('div');
            el.style.position = 'fixed';
            el.style.top = '0';
            el.style.left = '0';
            el.style.width = '0';
            el.style.height = '0';
            el.style.visibility = 'hidden';
            el.style.paddingTop = 'env(safe-area-inset-top, 0px)';
            el.style.paddingRight = 'env(safe-area-inset-right, 0px)';
            el.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
            el.style.paddingLeft = 'env(safe-area-inset-left, 0px)';
            document.body.appendChild(el);

            const computed = getComputedStyle(el);
            setInsets({
                top: parseInt(computed.paddingTop, 10) || 0,
                right: parseInt(computed.paddingRight, 10) || 0,
                bottom: parseInt(computed.paddingBottom, 10) || 0,
                left: parseInt(computed.paddingLeft, 10) || 0,
            });

            document.body.removeChild(el);
        };

        measureInsets();
        window.addEventListener('resize', measureInsets);
        window.addEventListener('orientationchange', measureInsets);

        return () => {
            window.removeEventListener('resize', measureInsets);
            window.removeEventListener('orientationchange', measureInsets);
        };
    }, []);

    return insets;
}

export default {
    useKeyboardAwareness,
    KeyboardAwareContainer,
    TouchTarget,
    LoadingProvider,
    useLoading,
    InlineLoading,
    LoadingButton,
    lockScroll,
    unlockScroll,
    useSafeAreaInsets,
};
