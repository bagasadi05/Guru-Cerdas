/**
 * Performance Optimization Utilities
 * 
 * This file provides utilities for optimizing React component performance
 * including memoization helpers and render tracking in development.
 */

import { useRef, useEffect, useCallback, useMemo, DependencyList } from 'react';

/**
 * Custom hook that returns a stable callback reference
 * Unlike useCallback, this doesn't require dependencies
 * The callback always has access to the latest closure values
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
    const callbackRef = useRef(callback);

    // Update the ref every render
    useEffect(() => {
        callbackRef.current = callback;
    });

    // Return a stable callback that uses the ref
    return useCallback(
        ((...args: any[]) => callbackRef.current(...args)) as T,
        []
    );
}

/**
 * Hook to detect unnecessary re-renders in development
 * Logs when a component re-renders and what props changed
 */
export function useWhyDidUpdate<T extends Record<string, any>>(
    name: string,
    props: T
) {
    const prevProps = useRef<T>();

    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            if (prevProps.current) {
                const allKeys = Object.keys({ ...prevProps.current, ...props });
                const changedProps: Record<string, { from: any; to: any }> = {};

                allKeys.forEach((key) => {
                    if (prevProps.current![key] !== props[key]) {
                        changedProps[key] = {
                            from: prevProps.current![key],
                            to: props[key],
                        };
                    }
                });

                if (Object.keys(changedProps).length > 0) {
                    console.log(`[${name}] Why did update:`, changedProps);
                }
            }
        }
        prevProps.current = props;
    });
}

/**
 * Hook to debounce a value
 * Returns the debounced value after the specified delay
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
 * Hook to throttle a callback
 * Limits how often the callback can be invoked
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
    callback: T,
    delay: number,
    deps: DependencyList = []
): T {
    const lastCall = useRef<number>(0);
    const timeout = useRef<NodeJS.Timeout>();

    const throttled = useCallback(
        ((...args: any[]) => {
            const now = Date.now();
            const timeSinceLastCall = now - lastCall.current;

            if (timeSinceLastCall >= delay) {
                lastCall.current = now;
                callback(...args);
            } else {
                // Schedule for later
                if (timeout.current) clearTimeout(timeout.current);
                timeout.current = setTimeout(() => {
                    lastCall.current = Date.now();
                    callback(...args);
                }, delay - timeSinceLastCall);
            }
        }) as T,
        [delay, ...deps]
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeout.current) clearTimeout(timeout.current);
        };
    }, []);

    return throttled;
}

/**
 * Hook to track render count in development
 */
export function useRenderCount(componentName: string): number {
    const count = useRef(0);
    count.current++;

    if (process.env.NODE_ENV === 'development') {
        console.log(`[${componentName}] Render count: ${count.current}`);
    }

    return count.current;
}

/**
 * Utility to create a fast comparison for arrays
 * Useful for memoization when array references change but content doesn't
 */
export function areArraysEqual<T>(a: T[], b: T[], compare?: (x: T, y: T) => boolean): boolean {
    if (a.length !== b.length) return false;
    if (compare) {
        return a.every((item, index) => compare(item, b[index]));
    }
    return a.every((item, index) => item === b[index]);
}

// Need to import useState for useDebouncedValue
import { useState } from 'react';
