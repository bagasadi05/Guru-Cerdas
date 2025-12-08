import React, { useState, useRef, useEffect } from 'react';
import { PlusIcon, XIcon } from '../Icons';

interface QuickAction {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    color?: string;
}

interface FloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: React.ReactNode;
    label?: string;
    position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
    offset?: { bottom?: number; right?: number; left?: number };
    size?: number;
    quickActions?: QuickAction[];
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
    children,
    icon,
    label,
    position = 'bottom-right',
    offset,
    size,
    quickActions,
    className = '',
    onClick,
    ...props
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLongPressing, setIsLongPressing] = useState(false);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Position classes - adjusted for mobile bottom nav (bottom-24 instead of bottom-20)
    const positionClasses: Record<string, string> = {
        'bottom-right': 'bottom-24 right-4 lg:bottom-8 lg:right-8',
        'bottom-left': 'bottom-24 left-4 lg:bottom-8 lg:left-8',
        'bottom-center': 'bottom-24 left-1/2 -translate-x-1/2 lg:bottom-8',
    };

    const style: React.CSSProperties = {};
    if (offset) {
        if (offset.bottom !== undefined) style.bottom = `${offset.bottom}px`;
        if (offset.right !== undefined) style.right = `${offset.right}px`;
        if (offset.left !== undefined) style.left = `${offset.left}px`;
    }
    if (size) {
        style.width = `${size}px`;
        style.height = `${size}px`;
    }

    // Long press handling for quick actions
    const handleTouchStart = () => {
        if (quickActions && quickActions.length > 0) {
            longPressTimer.current = setTimeout(() => {
                setIsLongPressing(true);
                setIsExpanded(true);
                // Haptic feedback if available
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }, 500);
        }
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        setIsLongPressing(false);
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (isExpanded) {
            setIsExpanded(false);
            return;
        }

        if (quickActions && quickActions.length > 0) {
            // If has quick actions, toggle expand on click
            setIsExpanded(!isExpanded);
        } else if (onClick) {
            onClick(e);
        }
    };

    const handleQuickAction = (action: QuickAction) => {
        action.onClick();
        setIsExpanded(false);
    };

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsExpanded(false);
            }
        };

        if (isExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isExpanded]);

    return (
        <div
            ref={containerRef}
            className={`fixed z-40 ${!offset ? positionClasses[position] : ''}`}
            style={offset ? { position: 'fixed', ...style } : {}}
        >
            {/* Quick Actions Menu */}
            {isExpanded && quickActions && quickActions.length > 0 && (
                <div className="absolute bottom-16 right-0 mb-2 flex flex-col gap-2 animate-fade-in">
                    {quickActions.map((action, index) => (
                        <button
                            key={index}
                            onClick={() => handleQuickAction(action)}
                            className={`
                                flex items-center gap-3 px-4 py-2.5 rounded-full shadow-lg
                                bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                                hover:bg-gray-50 dark:hover:bg-gray-700
                                transition-all duration-200 transform
                                animate-slide-up
                            `}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center ${action.color || 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
                                {action.icon}
                            </span>
                            <span className="text-sm font-medium whitespace-nowrap">
                                {action.label}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Main FAB Button */}
            <button
                className={`
                    flex items-center justify-center
                    rounded-full shadow-lg
                    bg-sky-600 hover:bg-sky-700 active:bg-sky-800
                    dark:bg-purple-600 dark:hover:bg-purple-700 dark:active:bg-purple-800
                    text-white transition-all duration-200
                    hover:scale-110 active:scale-95
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-purple-500
                    ${!size ? 'w-14 h-14' : ''}
                    ${isExpanded ? 'rotate-45' : ''}
                    ${className}
                `}
                style={size ? { width: `${size}px`, height: `${size}px` } : {}}
                onClick={handleClick}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                {...props}
                aria-label={label || 'Floating Action Button'}
                aria-expanded={isExpanded}
            >
                {isExpanded ? (
                    <XIcon className="w-6 h-6 transition-transform" />
                ) : (
                    children || icon || <PlusIcon className="w-6 h-6" />
                )}
            </button>

            {/* Label for screen readers */}
            {label && <span className="sr-only">{label}</span>}

            {/* Hint for long press */}
            {quickActions && quickActions.length > 0 && !isExpanded && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap bg-white dark:bg-gray-800 px-2 py-1 rounded shadow">
                        Tekan lama untuk menu cepat
                    </span>
                </div>
            )}
        </div>
    );
};

export default FloatingActionButton;

// Add these animations to your global CSS:
// @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
// @keyframes slide-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
// .animate-fade-in { animation: fade-in 0.2s ease-out; }
// .animate-slide-up { animation: slide-up 0.2s ease-out both; }
