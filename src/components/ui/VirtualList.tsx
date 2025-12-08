import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

interface VirtualListProps<T> {
    items: T[];
    itemHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    overscan?: number;
    className?: string;
    containerHeight?: number | string;
    onEndReached?: () => void;
    endReachedThreshold?: number;
    keyExtractor?: (item: T, index: number) => string;
}

export function VirtualList<T>({
    items,
    itemHeight,
    renderItem,
    overscan = 5,
    className = '',
    containerHeight = 400,
    onEndReached,
    endReachedThreshold = 200,
    keyExtractor = (_, index) => String(index),
}: VirtualListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeightState, setContainerHeightState] = useState(
        typeof containerHeight === 'number' ? containerHeight : 400
    );

    // Update container height on resize
    useEffect(() => {
        if (typeof containerHeight === 'number') {
            setContainerHeightState(containerHeight);
            return;
        }

        const updateHeight = () => {
            if (containerRef.current) {
                setContainerHeightState(containerRef.current.clientHeight);
            }
        };

        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, [containerHeight]);

    // Calculate visible range
    const { startIndex, endIndex, visibleItems, offsetY } = useMemo(() => {
        const totalHeight = items.length * itemHeight;
        const start = Math.floor(scrollTop / itemHeight);
        const visibleCount = Math.ceil(containerHeightState / itemHeight);

        const startWithOverscan = Math.max(0, start - overscan);
        const endWithOverscan = Math.min(items.length - 1, start + visibleCount + overscan);

        return {
            startIndex: startWithOverscan,
            endIndex: endWithOverscan,
            visibleItems: items.slice(startWithOverscan, endWithOverscan + 1),
            offsetY: startWithOverscan * itemHeight,
            totalHeight,
        };
    }, [items, itemHeight, scrollTop, containerHeightState, overscan]);

    // Handle scroll
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        setScrollTop(target.scrollTop);

        // Check for end reached
        if (onEndReached) {
            const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
            if (distanceFromBottom < endReachedThreshold) {
                onEndReached();
            }
        }
    }, [onEndReached, endReachedThreshold]);

    const totalHeight = items.length * itemHeight;

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className={`overflow-auto ${className}`}
            style={{
                height: typeof containerHeight === 'string' ? containerHeight : `${containerHeight}px`,
                position: 'relative'
            }}
        >
            {/* Spacer for total height */}
            <div style={{ height: totalHeight, position: 'relative' }}>
                {/* Visible items */}
                <div
                    style={{
                        position: 'absolute',
                        top: offsetY,
                        left: 0,
                        right: 0,
                    }}
                >
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

// Hook for virtual scrolling with external scroll container
export function useVirtualScroll<T>(
    items: T[],
    itemHeight: number,
    containerHeight: number,
    scrollTop: number,
    overscan = 5
) {
    return useMemo(() => {
        const start = Math.floor(scrollTop / itemHeight);
        const visibleCount = Math.ceil(containerHeight / itemHeight);

        const startIndex = Math.max(0, start - overscan);
        const endIndex = Math.min(items.length - 1, start + visibleCount + overscan);

        return {
            startIndex,
            endIndex,
            visibleItems: items.slice(startIndex, endIndex + 1),
            offsetY: startIndex * itemHeight,
            totalHeight: items.length * itemHeight,
        };
    }, [items, itemHeight, containerHeight, scrollTop, overscan]);
}

// Simple windowed list (for smaller lists that still benefit from virtualization)
interface WindowedListProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    windowSize?: number;
    className?: string;
    loadMoreLabel?: string;
    onLoadMore?: () => void;
}

export function WindowedList<T>({
    items,
    renderItem,
    windowSize = 20,
    className = '',
    loadMoreLabel = 'Tampilkan Lebih Banyak',
    onLoadMore,
}: WindowedListProps<T>) {
    const [visibleCount, setVisibleCount] = useState(windowSize);

    const visibleItems = items.slice(0, visibleCount);
    const hasMore = visibleCount < items.length;

    const handleLoadMore = () => {
        setVisibleCount(prev => Math.min(prev + windowSize, items.length));
        onLoadMore?.();
    };

    return (
        <div className={className}>
            {visibleItems.map((item, index) => (
                <React.Fragment key={index}>
                    {renderItem(item, index)}
                </React.Fragment>
            ))}

            {hasMore && (
                <div className="flex justify-center py-4">
                    <button
                        onClick={handleLoadMore}
                        className="px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    >
                        {loadMoreLabel} ({items.length - visibleCount} tersisa)
                    </button>
                </div>
            )}
        </div>
    );
}

export default VirtualList;
