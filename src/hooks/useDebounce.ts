/**
 * Debounce Hooks
 * Provides hooks for debouncing values and callbacks to prevent excessive state updates
 * during rapid user interactions.
 */

import { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Hook that debounces a value. Returns the debounced value that only updates
 * after the specified delay has passed since the last change.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds before the value updates
 * @returns The debounced value
 *
 * @example
 * ```typescript
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 300);
 *
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     fetchResults(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook that returns a debounced version of the provided callback.
 * The callback will only execute after the specified delay has passed
 * since the last invocation.
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds before the callback executes
 * @returns A debounced version of the callback
 *
 * @example
 * ```typescript
 * const debouncedSave = useDebouncedCallback((data: FormData) => {
 *   saveToServer(data);
 * }, 500);
 *
 * // Call frequently - only executes after 500ms of inactivity
 * <input onChange={(e) => debouncedSave({ name: e.target.value })} />
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef<T>(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedFn = useMemo(() => {
    const fn = (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    };
    return fn as unknown as T;
  }, [delay]);

  return debouncedFn;
}

export default useDebounce;
