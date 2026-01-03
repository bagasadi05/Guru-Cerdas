/**
 * Performance Optimization Components
 * 
 * Features:
 * - Virtualized lists for large datasets
 * - Lazy loading images
 * - Intersection observer utilities
 * - Debounced/throttled handlers
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';

// ============================================
// VIRTUALIZED LIST
// ============================================

interface VirtualizedListProps<T> {
    items: T[];
    itemHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    containerHeight?: number;
    overscan?: number;
    className?: string;
    emptyState?: React.ReactNode;
    keyExtractor?: (item: T, index: number) => string;
}

/**
 * Virtualized list that only renders visible items
 */
export function VirtualizedList<T>({
    items,
    itemHeight,
    renderItem,
    containerHeight = 400,
    overscan = 3,
    className = '',
    emptyState,
    keyExtractor = (_, index) => String(index),
}: VirtualizedListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    const { visibleItems, startIndex, totalHeight, offsetY } = useMemo(() => {
        const startIdx = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
        const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
        const endIndex = Math.min(items.length, startIdx + visibleCount);

        return {
            visibleItems: items.slice(startIdx, endIndex),
            startIndex: startIdx,
            totalHeight: items.length * itemHeight,
            offsetY: startIdx * itemHeight,
        };
    }, [items, itemHeight, scrollTop, containerHeight, overscan]);

    if (items.length === 0) {
        return <>{emptyState}</>;
    }

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className={`overflow-auto ${className}`}
            style={{ height: containerHeight }}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                    {visibleItems.map((item, index) => (
                        <div
                            key={keyExtractor(item, startIndex + index)}
                            style={{ height: itemHeight }}
                        >
                            {renderItem(item, startIndex + index)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ============================================
// VIRTUALIZED TABLE
// ============================================

interface Column<T> {
    key: string;
    header: React.ReactNode;
    width?: number | string;
    render: (item: T, index: number) => React.ReactNode;
}

interface VirtualizedTableProps<T> {
    data: T[];
    columns: Column<T>[];
    rowHeight?: number;
    headerHeight?: number;
    containerHeight?: number;
    overscan?: number;
    className?: string;
    emptyState?: React.ReactNode;
    keyExtractor?: (item: T, index: number) => string;
    onRowClick?: (item: T, index: number) => void;
    selectedIndex?: number;
}

/**
 * Virtualized table for large datasets
 */
export function VirtualizedTable<T>({
    data,
    columns,
    rowHeight = 48,
    headerHeight = 44,
    containerHeight = 400,
    overscan = 3,
    className = '',
    emptyState,
    keyExtractor = (_, index) => String(index),
    onRowClick,
    selectedIndex,
}: VirtualizedTableProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    const { visibleItems, startIndex, totalHeight, offsetY } = useMemo(() => {
        const bodyHeight = containerHeight - headerHeight;
        const startIdx = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
        const visibleCount = Math.ceil(bodyHeight / rowHeight) + 2 * overscan;
        const endIndex = Math.min(data.length, startIdx + visibleCount);

        return {
            visibleItems: data.slice(startIdx, endIndex),
            startIndex: startIdx,
            totalHeight: data.length * rowHeight,
            offsetY: startIdx * rowHeight,
        };
    }, [data, rowHeight, scrollTop, containerHeight, headerHeight, overscan]);

    if (data.length === 0) {
        return <>{emptyState}</>;
    }

    return (
        <div
            className={`rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden ${className}`}
            style={{ height: containerHeight }}
        >
            {/* Header */}
            <div
                className="flex bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700"
                style={{ height: headerHeight }}
            >
                {columns.map(col => (
                    <div
                        key={col.key}
                        className="px-4 flex items-center text-sm font-medium text-slate-600 dark:text-slate-400"
                        style={{ width: col.width || 'auto', flex: col.width ? 'none' : 1 }}
                    >
                        {col.header}
                    </div>
                ))}
            </div>

            {/* Body */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="overflow-auto"
                style={{ height: containerHeight - headerHeight }}
            >
                <div style={{ height: totalHeight, position: 'relative' }}>
                    <div style={{ transform: `translateY(${offsetY}px)` }}>
                        {visibleItems.map((item, index) => {
                            const actualIndex = startIndex + index;
                            const isSelected = selectedIndex === actualIndex;

                            return (
                                <div
                                    key={keyExtractor(item, actualIndex)}
                                    className={`
                                        flex border-b border-slate-100 dark:border-slate-800 last:border-b-0
                                        ${onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''}
                                        ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}
                                        transition-colors
                                    `}
                                    style={{ height: rowHeight }}
                                    onClick={() => onRowClick?.(item, actualIndex)}
                                >
                                    {columns.map(col => (
                                        <div
                                            key={col.key}
                                            className="px-4 flex items-center text-sm text-slate-700 dark:text-slate-300"
                                            style={{ width: col.width || 'auto', flex: col.width ? 'none' : 1 }}
                                        >
                                            {col.render(item, actualIndex)}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================
// LAZY LOADING IMAGE
// ============================================

interface LazyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    src: string;
    fallback?: string;
    placeholder?: React.ReactNode;
    threshold?: number;
    onLoad?: () => void;
    onError?: () => void;
}

/**
 * Lazy loading image with intersection observer
 */
export const LazyImage = memo<LazyImageProps>(({
    src,
    fallback = '/placeholder.png',
    placeholder,
    threshold = 0.1,
    onLoad,
    onError,
    className = '',
    alt = '',
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        if (!imgRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { threshold }
        );

        observer.observe(imgRef.current);

        return () => observer.disconnect();
    }, [threshold]);

    const handleLoad = () => {
        setIsLoaded(true);
        onLoad?.();
    };

    const handleError = () => {
        setHasError(true);
        onError?.();
    };

    const imageSrc = hasError ? fallback : (isInView ? src : '');

    return (
        <div className={`relative overflow-hidden ${className}`} ref={imgRef as React.RefObject<HTMLDivElement>}>
            {/* Placeholder */}
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                    {placeholder || (
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    )}
                </div>
            )}

            {/* Image */}
            {isInView && (
                <img
                    src={imageSrc}
                    alt={alt}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                    onLoad={handleLoad}
                    onError={handleError}
                    loading="lazy"
                    {...props}
                />
            )}
        </div>
    );
});

LazyImage.displayName = 'LazyImage';

// ============================================
// INTERSECTION OBSERVER HOOK
// ============================================

interface UseIntersectionOptions {
    threshold?: number | number[];
    rootMargin?: string;
    triggerOnce?: boolean;
}

/**
 * Hook for intersection observer
 */
export function useIntersection<T extends Element>(
    options: UseIntersectionOptions = {}
): [React.RefObject<T>, boolean] {
    const { threshold = 0, rootMargin = '0px', triggerOnce = false } = options;
    const ref = useRef<T>(null);
    const [isIntersecting, setIsIntersecting] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                const isVisible = entry.isIntersecting;
                setIsIntersecting(isVisible);

                if (isVisible && triggerOnce) {
                    observer.disconnect();
                }
            },
            { threshold, rootMargin }
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [threshold, rootMargin, triggerOnce]);

    return [ref, isIntersecting];
}

// ============================================
// DEBOUNCE & THROTTLE HOOKS
// ============================================

/**
 * Debounced value hook
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Debounced callback hook
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
    callback: T,
    delay: number
): T {
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

    const debouncedCallback = useCallback(
        (...args: Parameters<T>) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                callback(...args);
            }, delay);
        },
        [callback, delay]
    ) as T;

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return debouncedCallback;
}

/**
 * Throttled callback hook
 */
export function useThrottledCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
    callback: T,
    delay: number
): T {
    const lastRan = useRef(0);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

    const throttledCallback = useCallback(
        (...args: Parameters<T>) => {
            const now = Date.now();
            const remaining = delay - (now - lastRan.current);

            if (remaining <= 0) {
                lastRan.current = now;
                callback(...args);
            } else if (!timeoutRef.current) {
                timeoutRef.current = setTimeout(() => {
                    lastRan.current = Date.now();
                    timeoutRef.current = undefined;
                    callback(...args);
                }, remaining);
            }
        },
        [callback, delay]
    ) as T;

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return throttledCallback;
}

// ============================================
// INFINITE SCROLL
// ============================================

interface UseInfiniteScrollOptions {
    threshold?: number;
    rootMargin?: string;
    enabled?: boolean;
}

/**
 * Infinite scroll hook
 */
export function useInfiniteScroll(
    onLoadMore: () => void,
    options: UseInfiniteScrollOptions = {}
): React.RefObject<HTMLDivElement> {
    const { threshold = 0, rootMargin = '100px', enabled = true } = options;
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!enabled || !sentinelRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    onLoadMore();
                }
            },
            { threshold, rootMargin }
        );

        observer.observe(sentinelRef.current);

        return () => observer.disconnect();
    }, [onLoadMore, threshold, rootMargin, enabled]);

    return sentinelRef;
}

export default {
    VirtualizedList,
    VirtualizedTable,
    LazyImage,
    useIntersection,
    useDebounce,
    useDebouncedCallback,
    useThrottledCallback,
    useInfiniteScroll,
};
