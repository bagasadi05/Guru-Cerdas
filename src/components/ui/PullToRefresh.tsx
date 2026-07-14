/**
 * Pull to Refresh Component
 * Native-feeling pull-to-refresh for mobile platforms
 * Enhanced with success/error toasts, haptic feedback patterns, and reduced motion support
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useEnhancedHaptics } from '@/hooks/useEnhancedHaptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { hapticMedium } from '@/services/haptics';

interface PullToRefreshProps {
    children: React.ReactNode;
    onRefresh: () => Promise<void>;
    className?: string;
    disabled?: boolean;
    threshold?: number; // Pull distance threshold in pixels
}

type ToastType = 'success' | 'error' | null;

const PullToRefresh: React.FC<PullToRefreshProps> = ({
    children,
    onRefresh,
    className = '',
    disabled = false,
    threshold = 80,
}) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const [showToast, setShowToast] = useState<ToastType>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const currentY = useRef(0);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const haptics = useEnhancedHaptics();
    const { shouldReduceMotion } = useReducedMotion();

    // Auto-dismiss success toast after 2 seconds
    useEffect(() => {
        if (showToast === 'success') {
            toastTimerRef.current = setTimeout(() => {
                setShowToast(null);
            }, 2000);
        }
        return () => {
            if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current);
            }
        };
    }, [showToast]);

    const handleRetry = useCallback(async () => {
        setShowToast(null);
        setIsRefreshing(true);
        try {
            await onRefresh();
            haptics.success();
            setShowToast('success');
        } catch (error) {
            console.error('Refresh failed:', error);
            haptics.error();
            setShowToast('error');
        } finally {
            setIsRefreshing(false);
            setPullDistance(0);
        }
    }, [onRefresh, haptics]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (disabled || isRefreshing) return;

        const scrollTop = containerRef.current?.scrollTop ?? 0;
        if (scrollTop > 0) return; // Only enable pull when at top

        startY.current = e.touches[0].clientY;
        setIsPulling(true);
    }, [disabled, isRefreshing]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isPulling || disabled || isRefreshing) return;

        const scrollTop = containerRef.current?.scrollTop ?? 0;
        if (scrollTop > 0) {
            setIsPulling(false);
            setPullDistance(0);
            return;
        }

        currentY.current = e.touches[0].clientY;
        const distance = Math.max(0, currentY.current - startY.current);

        // Apply resistance - pull distance decreases as you pull more
        const resistedDistance = Math.min(distance * 0.5, threshold * 1.5);
        setPullDistance(resistedDistance);

        // Haptic feedback when crossing threshold
        if (resistedDistance >= threshold && pullDistance < threshold) {
            hapticMedium();
        }
    }, [isPulling, disabled, isRefreshing, threshold, pullDistance]);

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling || disabled) return;

        setIsPulling(false);

        if (pullDistance >= threshold && !isRefreshing) {
            setIsRefreshing(true);
            setShowToast(null);
            try {
                await onRefresh();
                haptics.success();
                setShowToast('success');
            } catch (error) {
                console.error('Refresh failed:', error);
                haptics.error();
                setShowToast('error');
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
            }
        } else {
            // Spring-back animation handled via CSS transition
            setPullDistance(0);
        }
    }, [isPulling, disabled, pullDistance, threshold, isRefreshing, onRefresh, haptics]);

    const pullProgress = Math.min(pullDistance / threshold, 1);
    const isThresholdReached = pullDistance >= threshold;

    // Spring-back transition with cubic-bezier for smooth feel
    const springBackTransition = shouldReduceMotion
        ? 'all 0.15s ease-out'
        : 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    // Indicator rotation (disabled when reduced motion is preferred)
    const indicatorRotation = shouldReduceMotion ? 0 : pullProgress * 180;

    return (
        <div
            ref={containerRef}
            className={`overflow-auto h-full relative ${className}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Toast notification */}
            {showToast && (
                <div
                    className={`absolute top-2 left-4 right-4 z-50 rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg ${
                        showToast === 'success'
                            ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
                    }`}
                    style={{
                        transition: shouldReduceMotion ? 'none' : 'opacity 0.2s ease-in-out',
                        animation: shouldReduceMotion ? 'none' : 'slideDown 0.3s ease-out',
                    }}
                    role="alert"
                    aria-live="polite"
                >
                    {showToast === 'success' ? (
                        <>
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                            <span className="text-sm text-green-800 dark:text-green-200 flex-1">
                                Data berhasil diperbarui
                            </span>
                        </>
                    ) : (
                        <>
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                            <span className="text-sm text-red-800 dark:text-red-200 flex-1">
                                Gagal memperbarui data
                            </span>
                            <button type="button"
                                onClick={handleRetry}
                                disabled={isRefreshing}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-800/50 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition-colors min-h-[36px] min-w-[36px] justify-center"
                                aria-label="Coba lagi memperbarui data"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Coba lagi</span>
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Pull indicator */}
            <div
                className="flex items-center justify-center overflow-hidden"
                style={{
                    height: isRefreshing ? 60 : pullDistance,
                    opacity: pullProgress,
                    transition: isPulling ? 'none' : springBackTransition,
                }}
            >
                <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${
                        shouldReduceMotion ? '' : 'transition-all duration-200'
                    } ${
                        isThresholdReached
                            ? 'bg-indigo-500 text-white scale-110'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                    style={{
                        transform: `rotate(${indicatorRotation}deg)`,
                    }}
                >
                    {isRefreshing ? (
                        <Loader2
                            className={`w-5 h-5 ${shouldReduceMotion ? '' : 'animate-spin'}`}
                        />
                    ) : (
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 14l-7 7m0 0l-7-7m7 7V3"
                            />
                        </svg>
                    )}
                </div>
            </div>

            {/* Content */}
            <div
                style={{
                    transform: isRefreshing ? 'translateY(0)' : `translateY(${pullDistance * 0.3}px)`,
                    transition: isPulling ? 'none' : springBackTransition,
                }}
            >
                {children}
            </div>
        </div>
    );
};

export default PullToRefresh;
