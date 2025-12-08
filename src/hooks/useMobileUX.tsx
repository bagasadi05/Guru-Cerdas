import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================
// Swipe Gesture Hook
// ============================================
interface SwipeConfig {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    threshold?: number; // Minimum distance to trigger swipe
    timeout?: number; // Maximum time for swipe gesture
}

export const useSwipeGesture = (config: SwipeConfig) => {
    const {
        onSwipeLeft,
        onSwipeRight,
        onSwipeUp,
        onSwipeDown,
        threshold = 50,
        timeout = 500,
    } = config;

    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        const touch = e.touches[0];
        touchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now(),
        };
    }, []);

    const handleTouchEnd = useCallback((e: TouchEvent) => {
        if (!touchStartRef.current) return;

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        const deltaTime = Date.now() - touchStartRef.current.time;

        // Check if it's a quick swipe
        if (deltaTime > timeout) {
            touchStartRef.current = null;
            return;
        }

        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Determine swipe direction
        if (absDeltaX > absDeltaY && absDeltaX > threshold) {
            if (deltaX > 0) {
                onSwipeRight?.();
            } else {
                onSwipeLeft?.();
            }
        } else if (absDeltaY > absDeltaX && absDeltaY > threshold) {
            if (deltaY > 0) {
                onSwipeDown?.();
            } else {
                onSwipeUp?.();
            }
        }

        touchStartRef.current = null;
    }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, timeout]);

    useEffect(() => {
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchEnd]);
};

// ============================================
// Pull to Refresh Hook
// ============================================
interface PullToRefreshConfig {
    onRefresh: () => Promise<void>;
    pullThreshold?: number;
    maxPull?: number;
}

export const usePullToRefresh = (
    elementRef: React.RefObject<HTMLElement>,
    config: PullToRefreshConfig
) => {
    const { onRefresh, pullThreshold = 80, maxPull = 120 } = config;
    const [isPulling, setIsPulling] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const startY = useRef(0);
    const currentY = useRef(0);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        const element = elementRef.current;
        if (!element || element.scrollTop > 0) return;

        startY.current = e.touches[0].clientY;
        setIsPulling(true);
    }, [elementRef]);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isPulling || isRefreshing) return;

        const element = elementRef.current;
        if (!element || element.scrollTop > 0) {
            setIsPulling(false);
            setPullDistance(0);
            return;
        }

        currentY.current = e.touches[0].clientY;
        const distance = Math.min(currentY.current - startY.current, maxPull);

        if (distance > 0) {
            e.preventDefault();
            setPullDistance(distance);
        }
    }, [isPulling, isRefreshing, maxPull, elementRef]);

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling) return;

        if (pullDistance >= pullThreshold && !isRefreshing) {
            setIsRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
            }
        }

        setIsPulling(false);
        setPullDistance(0);
    }, [isPulling, pullDistance, pullThreshold, isRefreshing, onRefresh]);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchmove', handleTouchMove, { passive: false });
        element.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
        };
    }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

    return {
        isPulling,
        pullDistance,
        isRefreshing,
        pullProgress: Math.min(pullDistance / pullThreshold, 1),
    };
};

// ============================================
// Pull to Refresh Indicator Component
// ============================================
interface PullToRefreshIndicatorProps {
    pullDistance: number;
    pullThreshold: number;
    isRefreshing: boolean;
}

export const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
    pullDistance,
    pullThreshold,
    isRefreshing,
}) => {
    const progress = Math.min(pullDistance / pullThreshold, 1);
    const rotation = progress * 360;

    if (pullDistance <= 0 && !isRefreshing) return null;

    return (
        <div
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-200"
            style={{
                opacity: Math.min(pullDistance / 30, 1),
                transform: `translateX(-50%) translateY(${Math.min(pullDistance / 2, 40)}px)`,
            }}
        >
            <div className="bg-white dark:bg-slate-800 rounded-full p-3 shadow-lg border border-slate-200 dark:border-slate-700">
                {isRefreshing ? (
                    <svg
                        className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin"
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
                ) : (
                    <svg
                        className="w-6 h-6 text-indigo-600 dark:text-indigo-400 transition-transform"
                        style={{ transform: `rotate(${rotation}deg)` }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                )}
            </div>
            {progress >= 1 && !isRefreshing && (
                <p className="text-xs text-center text-slate-600 dark:text-slate-400 mt-2 animate-pulse">
                    Lepaskan untuk refresh
                </p>
            )}
        </div>
    );
};

// ============================================
// More Menu Component for Bottom Nav
// ============================================
import React from 'react';

interface MoreMenuItem {
    href: string;
    label: string;
    icon: React.FC<{ className?: string }>;
}

interface MoreMenuProps {
    items: MoreMenuItem[];
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (href: string) => void;
}

export const MoreMenu: React.FC<MoreMenuProps> = ({ items, isOpen, onClose, onNavigate }) => {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Menu */}
            <div className="fixed bottom-20 right-4 z-50 animate-fade-in-up">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden min-w-[200px]">
                    {items.map((item, index) => (
                        <button
                            key={item.href}
                            onClick={() => {
                                onNavigate(item.href);
                                onClose();
                            }}
                            className={`flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${index !== items.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''
                                }`}
                            style={{ minHeight: '48px' }} // Ensuring 48px touch target
                        >
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <item.icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </div>
                            <span className="font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
};

// ============================================
// Touch Target Audit Utility
// ============================================
export const auditTouchTargets = () => {
    if (typeof window === 'undefined') return;

    const interactiveElements = document.querySelectorAll('button, a, [role="button"], input, select, textarea');
    const smallTargets: HTMLElement[] = [];

    interactiveElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width < 44 || rect.height < 44) {
            smallTargets.push(element as HTMLElement);
            console.warn('Touch target too small:', element, `${rect.width}x${rect.height}px`);
        }
    });

    if (smallTargets.length > 0) {
        console.warn(`Found ${smallTargets.length} touch targets smaller than 44x44px`);
    } else {
        console.log('All touch targets meet the 44x44px minimum requirement');
    }

    return smallTargets;
};

// ============================================
// CSS Styles for Mobile UX
// ============================================
export const mobileUXStyles = `
/* Ensure minimum touch target size */
.touch-target {
    min-width: 44px;
    min-height: 44px;
}

/* Better tap feedback */
.tap-feedback {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
}

.tap-feedback:active {
    transform: scale(0.97);
    opacity: 0.8;
}

/* Pull to refresh styles */
.pull-to-refresh-content {
    overscroll-behavior-y: contain;
}

/* Safe area padding for bottom nav */
.safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* Prevent text selection on mobile UI elements */
.no-select {
    -webkit-user-select: none;
    user-select: none;
}

/* Smooth scroll for mobile */
.smooth-scroll {
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
}
`;

export default {
    useSwipeGesture,
    usePullToRefresh,
    PullToRefreshIndicator,
    MoreMenu,
    auditTouchTargets,
};
