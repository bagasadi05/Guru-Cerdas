import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';

/**
 * Virtual List Component
 * Efficiently renders large lists by only rendering visible items
 */

interface VirtualListProps<T> {
    items: T[];
    itemHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    overscan?: number;
    className?: string;
    containerHeight?: number | string;
    onEndReached?: () => void;
    endReachedThreshold?: number;
}

export function VirtualList<T>({
    items,
    itemHeight,
    renderItem,
    overscan = 5,
    className = '',
    containerHeight = 400,
    onEndReached,
    endReachedThreshold = 100
}: VirtualListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeightPx, setContainerHeightPx] = useState(
        typeof containerHeight === 'number' ? containerHeight : 400
    );

    // Calculate visible range
    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
        items.length - 1,
        Math.floor((scrollTop + containerHeightPx) / itemHeight) + overscan
    );

    const visibleItems = useMemo(() => {
        return items.slice(startIndex, endIndex + 1).map((item, idx) => ({
            item,
            index: startIndex + idx
        }));
    }, [items, startIndex, endIndex]);

    // Handle scroll
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        setScrollTop(target.scrollTop);

        // Check if end is reached
        if (onEndReached) {
            const distanceFromEnd = target.scrollHeight - target.scrollTop - target.clientHeight;
            if (distanceFromEnd < endReachedThreshold) {
                onEndReached();
            }
        }
    }, [onEndReached, endReachedThreshold]);

    // Update container height on resize
    useEffect(() => {
        if (typeof containerHeight === 'string' && containerRef.current) {
            const updateHeight = () => {
                if (containerRef.current) {
                    setContainerHeightPx(containerRef.current.clientHeight);
                }
            };
            updateHeight();
            window.addEventListener('resize', updateHeight);
            return () => window.removeEventListener('resize', updateHeight);
        }
    }, [containerHeight]);

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className={`overflow-auto ${className}`}
            style={{
                height: containerHeight,
                position: 'relative'
            }}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                {visibleItems.map(({ item, index }) => (
                    <div
                        key={index}
                        style={{
                            position: 'absolute',
                            top: index * itemHeight,
                            left: 0,
                            right: 0,
                            height: itemHeight
                        }}
                    >
                        {renderItem(item, index)}
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Virtualized Grid Component
 */

interface VirtualGridProps<T> {
    items: T[];
    columns: number;
    rowHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    gap?: number;
    className?: string;
    containerHeight?: number;
}

export function VirtualGrid<T>({
    items,
    columns,
    rowHeight,
    renderItem,
    gap = 16,
    className = '',
    containerHeight = 400
}: VirtualGridProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);

    const rows = Math.ceil(items.length / columns);
    const totalHeight = rows * (rowHeight + gap) - gap;
    const startRow = Math.max(0, Math.floor(scrollTop / (rowHeight + gap)) - 2);
    const endRow = Math.min(
        rows - 1,
        Math.floor((scrollTop + containerHeight) / (rowHeight + gap)) + 2
    );

    const visibleItems = useMemo(() => {
        const result: { item: T; index: number; row: number; col: number }[] = [];
        for (let row = startRow; row <= endRow; row++) {
            for (let col = 0; col < columns; col++) {
                const index = row * columns + col;
                if (index < items.length) {
                    result.push({ item: items[index], index, row, col });
                }
            }
        }
        return result;
    }, [items, startRow, endRow, columns]);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    const itemWidth = `calc((100% - ${(columns - 1) * gap}px) / ${columns})`;

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className={`overflow-auto ${className}`}
            style={{ height: containerHeight, position: 'relative' }}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                {visibleItems.map(({ item, index, row, col }) => (
                    <div
                        key={index}
                        style={{
                            position: 'absolute',
                            top: row * (rowHeight + gap),
                            left: `calc(${col} * (${itemWidth} + ${gap}px))`,
                            width: itemWidth,
                            height: rowHeight
                        }}
                    >
                        {renderItem(item, index)}
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Debounced Search Input Component
 */

interface DebouncedSearchProps {
    value: string;
    onChange: (value: string) => void;
    delay?: number;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
}

export const DebouncedSearch: React.FC<DebouncedSearchProps> = memo(({
    value,
    onChange,
    delay = 300,
    placeholder = 'Cari...',
    className = '',
    autoFocus = false
}) => {
    const [localValue, setLocalValue] = useState(value);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            onChange(newValue);
        }, delay);
    }, [onChange, delay]);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return (
        <div className={`relative ${className}`}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <input
                type="text"
                value={localValue}
                onChange={handleChange}
                placeholder={placeholder}
                autoFocus={autoFocus}
                className="
                    w-full pl-10 pr-4 py-2.5 
                    bg-white dark:bg-slate-800 
                    border border-slate-200 dark:border-slate-700 
                    rounded-xl 
                    text-slate-900 dark:text-white 
                    placeholder-slate-400 
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                    transition-colors
                "
            />
            {localValue && (
                <button
                    onClick={() => {
                        setLocalValue('');
                        onChange('');
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    );
});

DebouncedSearch.displayName = 'DebouncedSearch';

/**
 * Memoized Card Component for Lists
 */

interface MemoizedCardProps {
    title: string;
    subtitle?: string;
    description?: string;
    avatar?: string;
    status?: 'active' | 'inactive' | 'pending';
    onClick?: () => void;
    actions?: React.ReactNode;
}

export const MemoizedCard = memo<MemoizedCardProps>(({
    title,
    subtitle,
    description,
    avatar,
    status,
    onClick,
    actions
}) => {
    const statusColors = {
        active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        inactive: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
        pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
    };

    return (
        <div
            onClick={onClick}
            className={`
                p-4 bg-white dark:bg-slate-900 
                border border-slate-200 dark:border-slate-700 
                rounded-xl shadow-sm
                ${onClick ? 'cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all' : ''}
            `}
        >
            <div className="flex items-start gap-3">
                {avatar && (
                    <img
                        src={avatar}
                        alt={title}
                        loading="lazy"
                        className="w-10 h-10 rounded-full object-cover"
                    />
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900 dark:text-white truncate">
                            {title}
                        </h3>
                        {status && (
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[status]}`}>
                                {status}
                            </span>
                        )}
                    </div>
                    {subtitle && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
                    )}
                    {description && (
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                            {description}
                        </p>
                    )}
                </div>
                {actions && (
                    <div className="flex-shrink-0">{actions}</div>
                )}
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for better memoization
    return (
        prevProps.title === nextProps.title &&
        prevProps.subtitle === nextProps.subtitle &&
        prevProps.description === nextProps.description &&
        prevProps.avatar === nextProps.avatar &&
        prevProps.status === nextProps.status
    );
});

MemoizedCard.displayName = 'MemoizedCard';

/**
 * Lazy Image Component with WebP support
 */

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    webpSrc?: string;
    placeholderSrc?: string;
    fallbackSrc?: string;
}

export const LazyImage: React.FC<LazyImageProps> = memo(({
    src,
    webpSrc,
    placeholderSrc,
    fallbackSrc = '/placeholder.png',
    alt = '',
    className = '',
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        if (!imgRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target as HTMLImageElement;
                        img.src = webpSrc || src;
                        observer.unobserve(img);
                    }
                });
            },
            { rootMargin: '50px' }
        );

        observer.observe(imgRef.current);
        return () => observer.disconnect();
    }, [src, webpSrc]);

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Placeholder */}
            {!isLoaded && !hasError && (
                <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse" />
            )}

            {/* Main image */}
            <img
                ref={imgRef}
                src={placeholderSrc || ''}
                alt={alt}
                onLoad={() => setIsLoaded(true)}
                onError={() => {
                    setHasError(true);
                    if (imgRef.current) {
                        imgRef.current.src = fallbackSrc;
                    }
                }}
                className={`
                    w-full h-full object-cover 
                    transition-opacity duration-300
                    ${isLoaded ? 'opacity-100' : 'opacity-0'}
                `}
                {...props}
            />
        </div>
    );
});

LazyImage.displayName = 'LazyImage';

/**
 * Intersection Observer Hook for Lazy Loading
 */

export function useInView(options?: IntersectionObserverInit) {
    const [isInView, setIsInView] = useState(false);
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        const observer = new IntersectionObserver(([entry]) => {
            setIsInView(entry.isIntersecting);
        }, options);

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [options]);

    return { ref, isInView };
}

/**
 * Lazy Component Wrapper
 */

interface LazyComponentProps {
    children: React.ReactNode;
    placeholder?: React.ReactNode;
    rootMargin?: string;
}

export const LazyComponent: React.FC<LazyComponentProps> = ({
    children,
    placeholder = <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />,
    rootMargin = '100px'
}) => {
    const [shouldRender, setShouldRender] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShouldRender(true);
                    observer.disconnect();
                }
            },
            { rootMargin }
        );

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [rootMargin]);

    return (
        <div ref={ref}>
            {shouldRender ? children : placeholder}
        </div>
    );
};

/**
 * Performance Monitor Component (Dev Only)
 */

export const PerformanceMonitor: React.FC<{ enabled?: boolean }> = ({ enabled = false }) => {
    const [metrics, setMetrics] = useState({
        fps: 0,
        memory: 0,
        renderCount: 0
    });
    const frameRef = useRef(0);
    const lastTimeRef = useRef(performance.now());
    const renderCountRef = useRef(0);

    useEffect(() => {
        if (!enabled) return;

        let animationId: number;

        const measureFPS = () => {
            const now = performance.now();
            const delta = now - lastTimeRef.current;

            if (delta >= 1000) {
                setMetrics(prev => ({
                    ...prev,
                    fps: Math.round((frameRef.current * 1000) / delta),
                    memory: (performance as any).memory?.usedJSHeapSize
                        ? Math.round((performance as any).memory.usedJSHeapSize / 1048576)
                        : 0
                }));
                frameRef.current = 0;
                lastTimeRef.current = now;
            }

            frameRef.current++;
            animationId = requestAnimationFrame(measureFPS);
        };

        animationId = requestAnimationFrame(measureFPS);
        return () => cancelAnimationFrame(animationId);
    }, [enabled]);

    useEffect(() => {
        renderCountRef.current++;
        setMetrics(prev => ({ ...prev, renderCount: renderCountRef.current }));
    });

    if (!enabled) return null;

    return (
        <div className="fixed bottom-4 left-4 p-3 bg-black/80 text-white text-xs rounded-lg font-mono z-50">
            <div>FPS: {metrics.fps}</div>
            {metrics.memory > 0 && <div>Memory: {metrics.memory}MB</div>}
            <div>Renders: {metrics.renderCount}</div>
        </div>
    );
};

export default {
    VirtualList,
    VirtualGrid,
    DebouncedSearch,
    MemoizedCard,
    LazyImage,
    LazyComponent,
    PerformanceMonitor,
    useInView
};
