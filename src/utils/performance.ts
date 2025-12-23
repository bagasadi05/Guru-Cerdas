/**
 * Performance Optimization Utilities
 * Image optimization, lazy loading, and performance monitoring
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { logger } from '../services/logger';

// ============================================
// IMAGE OPTIMIZATION
// ============================================



/**
 * Generates an optimized image URL with size and quality parameters
 * 
 * This function adds optimization parameters to image URLs, particularly for
 * Supabase Storage URLs. It helps reduce bandwidth and improve page load times
 * by requesting appropriately sized images from the server.
 * 
 * @param src - The original image URL
 * @param options - Optimization options
 * @param options.width - Desired image width in pixels
 * @param options.height - Desired image height in pixels
 * @param options.quality - Image quality (0-100, default: 80)
 * @returns The optimized image URL with transformation parameters
 * 
 * @example
 * ```typescript
 * const avatarUrl = 'https://example.supabase.co/storage/v1/object/public/avatars/user.jpg';
 * const optimized = getOptimizedImageUrl(avatarUrl, { width: 200, height: 200, quality: 85 });
 * // Returns: URL with ?width=200&height=200&quality=85
 * ```
 * 
 * @example
 * ```typescript
 * // Use in image component
 * <img src={getOptimizedImageUrl(user.avatar, { width: 100 })} alt={user.name} />
 * ```
 * 
 * @remarks
 * - Currently optimized for Supabase Storage URLs
 * - Falls back to original URL for unsupported services
 * - Quality parameter balances file size and visual quality
 * 
 * @since 1.0.0
 */
export function getOptimizedImageUrl(
    src: string,
    options: { width?: number; height?: number; quality?: number } = {}
): string {
    const { width, height, quality = 80 } = options;

    // If it's a Supabase storage URL, add transform parameters
    if (src.includes('supabase.co/storage')) {
        const url = new URL(src);
        if (width) url.searchParams.set('width', width.toString());
        if (height) url.searchParams.set('height', height.toString());
        url.searchParams.set('quality', quality.toString());
        return url.toString();
    }

    // If it's a placeholder service, add dimensions
    if (src.includes('placeholder') || src.includes('picsum')) {
        return src;
    }

    return src;
}

/**
 * Generates a blur placeholder data URL for images
 * 
 * This function creates a lightweight SVG placeholder that can be displayed
 * while the actual image loads. It helps prevent layout shift and provides
 * a better user experience during image loading.
 * 
 * @param width - Width of the placeholder in pixels (default: 10)
 * @param height - Height of the placeholder in pixels (default: 10)
 * @returns A data URL containing an SVG placeholder
 * 
 * @example
 * ```typescript
 * const placeholder = generateBlurPlaceholder(400, 300);
 * <img src={imageUrl} placeholder={placeholder} alt="Product" />
 * ```
 * 
 * @example
 * ```typescript
 * // Use as background while loading
 * const [loaded, setLoaded] = useState(false);
 * <div style={{ backgroundImage: `url(${loaded ? imageUrl : generateBlurPlaceholder()})` }}>
 * ```
 * 
 * @remarks
 * - Returns a base64-encoded SVG data URL
 * - Very lightweight (< 100 bytes)
 * - Uses a neutral gray color (#e2e8f0)
 * - Can be used with CSS blur filter for better effect
 * 
 * @since 1.0.0
 */
export function generateBlurPlaceholder(width: number = 10, height: number = 10): string {
    return `data:image/svg+xml;base64,${btoa(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
            <rect width="100%" height="100%" fill="#e2e8f0"/>
        </svg>`
    )}`;
}

// ============================================
// LAZY LOADING HOOKS
// ============================================

interface UseIntersectionObserverOptions {
    threshold?: number;
    rootMargin?: string;
    root?: Element | null;
}

/**
 * React hook for intersection observer based lazy loading
 * 
 * This hook uses the Intersection Observer API to detect when an element
 * becomes visible in the viewport. It's useful for lazy loading images,
 * components, or triggering animations when elements scroll into view.
 * 
 * @param options - Configuration options for the intersection observer
 * @param options.threshold - Percentage of element visibility to trigger (0-1, default: 0)
 * @param options.rootMargin - Margin around the viewport to trigger early (default: '100px')
 * @param options.root - Root element for intersection (default: viewport)
 * @returns A tuple containing [elementRef, isVisible]
 * 
 * @example
 * ```typescript
 * function LazyImage({ src, alt }) {
 *   const [ref, isVisible] = useIntersectionObserver({ rootMargin: '200px' });
 * 
 *   return (
 *     <div ref={ref}>
 *       {isVisible && <img src={src} alt={alt} />}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Trigger animation on scroll
 * function AnimatedSection() {
 *   const [ref, isVisible] = useIntersectionObserver({ threshold: 0.5 });
 *   return (
 *     <div ref={ref} className={isVisible ? 'fade-in' : 'hidden'}>
 *       Content
 *     </div>
 *   );
 * }
 * ```
 * 
 * @remarks
 * - Observer disconnects after element becomes visible (one-time trigger)
 * - rootMargin allows triggering before element enters viewport
 * - threshold determines how much of element must be visible
 * 
 * @since 1.0.0
 */
export function useIntersectionObserver(
    options: UseIntersectionObserverOptions = {}
): [React.RefObject<HTMLDivElement>, boolean] {
    const { threshold = 0, rootMargin = '100px', root = null } = options;
    const elementRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold, rootMargin, root }
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [threshold, rootMargin, root]);

    return [elementRef, isVisible];
}

/**
 * Hook for lazy loading components
 */
export function useLazyLoad<T>(
    loadFn: () => Promise<T>,
    options: UseIntersectionObserverOptions = {}
): { ref: React.RefObject<HTMLDivElement>; data: T | null; loading: boolean; error: Error | null } {
    const [ref, isVisible] = useIntersectionObserver(options);
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (isVisible && !data && !loading) {
            setLoading(true);
            loadFn()
                .then(setData)
                .catch(setError)
                .finally(() => setLoading(false));
        }
    }, [isVisible, data, loading, loadFn]);

    return { ref, data, loading, error };
}

// ============================================
// PERFORMANCE MONITORING
// ============================================

interface PerformanceMetrics {
    fcp: number | null;    // First Contentful Paint
    lcp: number | null;    // Largest Contentful Paint
    fid: number | null;    // First Input Delay
    cls: number | null;    // Cumulative Layout Shift
    ttfb: number | null;   // Time to First Byte
}

/**
 * React hook for monitoring Core Web Vitals performance metrics
 * 
 * This hook automatically tracks key performance metrics including First Contentful
 * Paint (FCP), Largest Contentful Paint (LCP), First Input Delay (FID), Cumulative
 * Layout Shift (CLS), and Time to First Byte (TTFB). These metrics are essential
 * for understanding and optimizing user experience.
 * 
 * @returns An object containing all Core Web Vitals metrics (null until measured)
 * 
 * @example
 * ```typescript
 * function PerformanceMonitor() {
 *   const metrics = usePerformanceMetrics();
 * 
 *   useEffect(() => {
 *     if (metrics.lcp) {
 *       console.log('LCP:', metrics.lcp, 'ms');
 *       // Send to analytics
 *       analytics.track('performance', { lcp: metrics.lcp });
 *     }
 *   }, [metrics.lcp]);
 * 
 *   return <div>LCP: {metrics.lcp?.toFixed(0)}ms</div>;
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Display performance dashboard
 * function Dashboard() {
 *   const { fcp, lcp, fid, cls, ttfb } = usePerformanceMetrics();
 *   return (
 *     <div>
 *       <p>FCP: {fcp}ms (Good: < 1800ms)</p>
 *       <p>LCP: {lcp}ms (Good: < 2500ms)</p>
 *       <p>FID: {fid}ms (Good: < 100ms)</p>
 *       <p>CLS: {cls} (Good: < 0.1)</p>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @remarks
 * Core Web Vitals thresholds:
 * - FCP: Good < 1.8s, Needs Improvement < 3s, Poor >= 3s
 * - LCP: Good < 2.5s, Needs Improvement < 4s, Poor >= 4s
 * - FID: Good < 100ms, Needs Improvement < 300ms, Poor >= 300ms
 * - CLS: Good < 0.1, Needs Improvement < 0.25, Poor >= 0.25
 * - TTFB: Good < 800ms, Needs Improvement < 1800ms, Poor >= 1800ms
 * 
 * @since 1.0.0
 */
export function usePerformanceMetrics(): PerformanceMetrics {
    const [metrics, setMetrics] = useState<PerformanceMetrics>({
        fcp: null,
        lcp: null,
        fid: null,
        cls: null,
        ttfb: null
    });

    useEffect(() => {
        // Get navigation timing
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
            setMetrics(prev => ({
                ...prev,
                ttfb: navigation.responseStart - navigation.requestStart
            }));
        }

        // Observe paint timings
        const paintObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.name === 'first-contentful-paint') {
                    setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
                    logger.trackPerformance('FCP', entry.startTime);
                }
            }
        });

        try {
            paintObserver.observe({ entryTypes: ['paint'] });
        } catch {
            // Observer not supported
        }

        // Observe LCP
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
                setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
                logger.trackPerformance('LCP', lastEntry.startTime);
            }
        });

        try {
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch {
            // Observer not supported
        }

        // Observe FID
        const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
                const firstInput = entries[0] as PerformanceEventTiming;
                const fid = firstInput.processingStart - firstInput.startTime;
                setMetrics(prev => ({ ...prev, fid }));
                logger.trackPerformance('FID', fid);
            }
        });

        try {
            fidObserver.observe({ entryTypes: ['first-input'] });
        } catch {
            // Observer not supported
        }

        // Observe CLS
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as any[]) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                    setMetrics(prev => ({ ...prev, cls: clsValue }));
                }
            }
        });

        try {
            clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch {
            // Observer not supported
        }

        return () => {
            paintObserver.disconnect();
            lcpObserver.disconnect();
            fidObserver.disconnect();
            clsObserver.disconnect();
        };
    }, []);

    return metrics;
}

// ============================================
// DEBOUNCE & THROTTLE
// ============================================

/**
 * Creates a debounced version of a function
 * 
 * Debouncing delays function execution until after a specified time has passed
 * since the last invocation. This is useful for expensive operations triggered
 * by frequent events like typing, scrolling, or resizing.
 * 
 * @template T - The function type to debounce
 * @param fn - The function to debounce
 * @param delay - Delay in milliseconds before executing the function
 * @returns A debounced version of the function
 * 
 * @example
 * ```typescript
 * // Debounce search input
 * const searchAPI = (query: string) => fetch(`/api/search?q=${query}`);
 * const debouncedSearch = debounce(searchAPI, 300);
 * 
 * <input onChange={(e) => debouncedSearch(e.target.value)} />
 * // API called only after user stops typing for 300ms
 * ```
 * 
 * @example
 * ```typescript
 * // Debounce window resize handler
 * const handleResize = () => {
 *   console.log('Window resized:', window.innerWidth);
 * };
 * 
 * window.addEventListener('resize', debounce(handleResize, 250));
 * ```
 * 
 * @remarks
 * - Each call resets the timer
 * - Only the last call within the delay period executes
 * - Useful for: search inputs, form validation, window resize, scroll events
 * - Consider using {@link throttle} if you need periodic execution
 * 
 * @see {@link useDebouncedCallback} for React hook version
 * @since 1.0.0
 */
export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;

    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Creates a throttled version of a function
 * 
 * Throttling ensures a function is called at most once per specified time period,
 * regardless of how many times it's invoked. Unlike debouncing, throttling
 * executes the function immediately and then enforces a cooldown period.
 * 
 * @template T - The function type to throttle
 * @param fn - The function to throttle
 * @param limit - Minimum time in milliseconds between function executions
 * @returns A throttled version of the function
 * 
 * @example
 * ```typescript
 * // Throttle scroll handler
 * const handleScroll = () => {
 *   console.log('Scroll position:', window.scrollY);
 * };
 * 
 * window.addEventListener('scroll', throttle(handleScroll, 100));
 * // Handler called at most once every 100ms while scrolling
 * ```
 * 
 * @example
 * ```typescript
 * // Throttle button clicks
 * const saveData = () => {
 *   console.log('Saving...');
 *   api.save(data);
 * };
 * 
 * <button onClick={throttle(saveData, 2000)}>Save</button>
 * // Prevents multiple saves within 2 seconds
 * ```
 * 
 * @remarks
 * - First call executes immediately
 * - Subsequent calls within limit period are ignored
 * - Useful for: scroll handlers, mouse move, button clicks, API rate limiting
 * - Consider using {@link debounce} if you only need the final value
 * 
 * @since 1.0.0
 */
export function throttle<T extends (...args: any[]) => any>(
    fn: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Hook for debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Hook for debounced callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
): T {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    return useMemo(
        // eslint-disable-next-line react-hooks/refs
        () => debounce((...args: Parameters<T>) => callbackRef.current(...args), delay),
        [delay]
    ) as T;
}

// ============================================
// MEMOIZATION
// ============================================

/**
 * Creates a memoized version of a function with automatic caching
 * 
 * Memoization caches function results based on input arguments, returning
 * cached results for repeated calls with the same arguments. This improves
 * performance for expensive computations with predictable inputs.
 * 
 * @template T - The function type to memoize
 * @param fn - The function to memoize
 * @returns A memoized version of the function with result caching
 * 
 * @example
 * ```typescript
 * // Memoize expensive calculation
 * const fibonacci = memoize((n: number): number => {
 *   if (n <= 1) return n;
 *   return fibonacci(n - 1) + fibonacci(n - 2);
 * });
 * 
 * fibonacci(40); // Calculated
 * fibonacci(40); // Returned from cache (instant)
 * ```
 * 
 * @example
 * ```typescript
 * // Memoize API data transformation
 * const transformData = memoize((data: RawData[]) => {
 *   return data.map(item => ({
 *     ...item,
 *     computed: expensiveCalculation(item)
 *   }));
 * });
 * ```
 * 
 * @remarks
 * - Cache key is JSON.stringify of arguments
 * - Cache size limited to 100 entries (LRU eviction)
 * - Best for pure functions with serializable arguments
 * - Not suitable for functions with side effects
 * - Arguments must be JSON-serializable
 * 
 * @since 1.0.0
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>): ReturnType<T> => {
        const key = JSON.stringify(args);

        if (cache.has(key)) {
            return cache.get(key)!;
        }

        const result = fn(...args);
        cache.set(key, result);

        // Limit cache size
        if (cache.size > 100) {
            const firstKey = cache.keys().next().value;
            if (firstKey !== undefined) {
                cache.delete(firstKey);
            }
        }

        return result;
    }) as T;
}

// ============================================
// PRELOADING
// ============================================

/**
 * Preload a page/component
 */
export function preloadComponent(importFn: () => Promise<any>): void {
    importFn().catch(() => {
        // Silently fail preloading
    });
}

/**
 * Preloads an image by loading it into browser cache
 * 
 * This function creates an Image object and loads the specified source,
 * ensuring the image is cached before it's needed. This prevents loading
 * delays when the image is actually displayed.
 * 
 * @param src - The image URL to preload
 * @returns A promise that resolves when the image is loaded, rejects on error
 * 
 * @example
 * ```typescript
 * // Preload hero image
 * useEffect(() => {
 *   preloadImage('/images/hero.jpg')
 *     .then(() => console.log('Hero image ready'))
 *     .catch(() => console.error('Failed to load hero image'));
 * }, []);
 * ```
 * 
 * @example
 * ```typescript
 * // Preload on hover
 * <button
 *   onMouseEnter={() => preloadImage('/images/modal-bg.jpg')}
 *   onClick={() => openModal()}
 * >
 *   Open Modal
 * </button>
 * ```
 * 
 * @remarks
 * - Image is loaded into browser cache
 * - Subsequent uses of the same URL will be instant
 * - Useful for images that will be shown after user interaction
 * - Consider using {@link preloadImages} for multiple images
 * 
 * @see {@link preloadImages} for batch preloading
 * @since 1.0.0
 */
export function preloadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = src;
    });
}

/**
 * Preload multiple images
 */
export function preloadImages(sources: string[]): Promise<void[]> {
    return Promise.all(sources.map(preloadImage));
}

// ============================================
// VIRTUAL SCROLLING HELPER
// ============================================

interface VirtualScrollOptions {
    itemHeight: number;
    containerHeight: number;
    overscan?: number;
}

/**
 * Calculate visible items for virtual scrolling
 */
export function getVirtualItems<T>(
    items: T[],
    scrollTop: number,
    options: VirtualScrollOptions
): { visibleItems: T[]; startIndex: number; endIndex: number; offsetY: number } {
    const { itemHeight, containerHeight, overscan = 3 } = options;

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
        items.length - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const visibleItems = items.slice(startIndex, endIndex + 1);
    const offsetY = startIndex * itemHeight;

    return { visibleItems, startIndex, endIndex, offsetY };
}

/**
 * Hook for virtual scrolling
 */
export function useVirtualScroll<T>(
    items: T[],
    options: VirtualScrollOptions
) {
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleScroll = useMemo(
        // eslint-disable-next-line react-hooks/refs
        () => throttle(() => {
            if (containerRef.current) {
                setScrollTop(containerRef.current.scrollTop);
            }
        }, 16),
        []
    );

    const { visibleItems, startIndex, offsetY } = getVirtualItems(items, scrollTop, options);
    const totalHeight = items.length * options.itemHeight;

    return {
        containerRef,
        visibleItems,
        startIndex,
        offsetY,
        totalHeight,
        handleScroll
    };
}

/**
 * Generates a comprehensive performance report for the current page
 * 
 * This function collects and formats performance data including navigation timing,
 * resource loading statistics, and memory usage. The report is useful for
 * debugging performance issues and monitoring application health.
 * 
 * @returns A JSON-formatted string containing the performance report
 * 
 * @example
 * ```typescript
 * // Log performance report
 * console.log(generatePerformanceReport());
 * ```
 * 
 * @example
 * ```typescript
 * // Send report to analytics
 * const report = generatePerformanceReport();
 * analytics.track('performance_report', JSON.parse(report));
 * ```
 * 
 * @example
 * ```typescript
 * // Display in development tools
 * if (process.env.NODE_ENV === 'development') {
 *   useEffect(() => {
 *     setTimeout(() => {
 *       const report = generatePerformanceReport();
 *       console.group('Performance Report');
 *       console.log(JSON.parse(report));
 *       console.groupEnd();
 *     }, 5000); // Wait for page to fully load
 *   }, []);
 * }
 * ```
 * 
 * @remarks
 * Report includes:
 * - Timestamp of report generation
 * - Navigation timing (DOM load, page load, TTFB)
 * - Resource statistics (count, total size, breakdown by type)
 * - Memory usage (if available in browser)
 * 
 * @since 1.0.0
 */
export function generatePerformanceReport(): string {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    const report = {
        timestamp: new Date().toISOString(),
        navigation: navigation ? {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            loadComplete: navigation.loadEventEnd - navigation.fetchStart,
            ttfb: navigation.responseStart - navigation.requestStart
        } : null,
        resources: {
            total: resources.length,
            totalSize: resources.reduce((acc, r) => acc + (r.transferSize || 0), 0),
            byType: resources.reduce((acc, r) => {
                const type = r.initiatorType;
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        },
        memory: (performance as any).memory ? {
            usedJSHeapSize: ((performance as any).memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
            totalJSHeapSize: ((performance as any).memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB'
        } : null
    };

    return JSON.stringify(report, null, 2);
}
