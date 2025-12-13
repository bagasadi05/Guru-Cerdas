/**
 * Pull to Refresh Component
 * Native-feeling pull-to-refresh for mobile platforms
 */

import React, { useState, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { hapticMedium, hapticSuccess } from '@/services/haptics';

interface PullToRefreshProps {
    children: React.ReactNode;
    onRefresh: () => Promise<void>;
    className?: string;
    disabled?: boolean;
    threshold?: number; // Pull distance threshold in pixels
}

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
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const currentY = useRef(0);

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
            try {
                await onRefresh();
                hapticSuccess();
            } catch (error) {
                console.error('Refresh failed:', error);
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
            }
        } else {
            setPullDistance(0);
        }
    }, [isPulling, disabled, pullDistance, threshold, isRefreshing, onRefresh]);

    const pullProgress = Math.min(pullDistance / threshold, 1);
    const isThresholdReached = pullDistance >= threshold;

    return (
        <div
            ref={containerRef}
            className={`overflow-auto h-full ${className}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull indicator */}
            <div
                className="flex items-center justify-center overflow-hidden transition-all duration-200 ease-out"
                style={{
                    height: isRefreshing ? 60 : pullDistance,
                    opacity: pullProgress,
                }}
            >
                <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${isThresholdReached
                        ? 'bg-indigo-500 text-white scale-110'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                    style={{
                        transform: `rotate(${pullProgress * 180}deg)`,
                    }}
                >
                    {isRefreshing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
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
                    transition: isPulling ? 'none' : 'transform 0.3s ease-out',
                }}
            >
                {children}
            </div>
        </div>
    );
};

export default PullToRefresh;
