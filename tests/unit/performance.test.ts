import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    debounce,
    throttle,
    memoize,
    getOptimizedImageUrl,
    generateBlurPlaceholder,
    getVirtualItems,
    preloadImage
} from '../../src/utils/performance';

describe('Performance Utilities', () => {
    describe('debounce', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('delays function execution', () => {
            const fn = vi.fn();
            const debouncedFn = debounce(fn, 100);

            debouncedFn();
            expect(fn).not.toHaveBeenCalled();

            vi.advanceTimersByTime(100);
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('only calls once for rapid calls', () => {
            const fn = vi.fn();
            const debouncedFn = debounce(fn, 100);

            debouncedFn();
            debouncedFn();
            debouncedFn();

            vi.advanceTimersByTime(100);
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('passes arguments correctly', () => {
            const fn = vi.fn();
            const debouncedFn = debounce(fn, 100);

            debouncedFn('arg1', 'arg2');
            vi.advanceTimersByTime(100);

            expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
        });
    });

    describe('throttle', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('executes immediately on first call', () => {
            const fn = vi.fn();
            const throttledFn = throttle(fn, 100);

            throttledFn();
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('blocks rapid subsequent calls', () => {
            const fn = vi.fn();
            const throttledFn = throttle(fn, 100);

            throttledFn();
            throttledFn();
            throttledFn();

            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('allows call after throttle period', () => {
            const fn = vi.fn();
            const throttledFn = throttle(fn, 100);

            throttledFn();
            vi.advanceTimersByTime(100);
            throttledFn();

            expect(fn).toHaveBeenCalledTimes(2);
        });
    });

    describe('memoize', () => {
        it('caches function results', () => {
            const fn = vi.fn((x: number) => x * 2);
            const memoizedFn = memoize(fn);

            expect(memoizedFn(5)).toBe(10);
            expect(memoizedFn(5)).toBe(10);
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('recomputes for different arguments', () => {
            const fn = vi.fn((x: number) => x * 2);
            const memoizedFn = memoize(fn);

            expect(memoizedFn(5)).toBe(10);
            expect(memoizedFn(10)).toBe(20);
            expect(fn).toHaveBeenCalledTimes(2);
        });

        it('handles multiple arguments', () => {
            const fn = vi.fn((a: number, b: number) => a + b);
            const memoizedFn = memoize(fn);

            expect(memoizedFn(1, 2)).toBe(3);
            expect(memoizedFn(1, 2)).toBe(3);
            expect(fn).toHaveBeenCalledTimes(1);
        });
    });

    describe('getOptimizedImageUrl', () => {
        it('returns original URL for non-supabase URLs', () => {
            const url = 'https://example.com/image.jpg';
            expect(getOptimizedImageUrl(url)).toBe(url);
        });

        it('adds parameters to supabase URLs', () => {
            const url = 'https://test.supabase.co/storage/v1/object/image.jpg';
            const result = getOptimizedImageUrl(url, { width: 200, height: 150 });

            expect(result).toContain('width=200');
            expect(result).toContain('height=150');
            expect(result).toContain('quality=80');
        });

        it('uses custom quality', () => {
            const url = 'https://test.supabase.co/storage/v1/object/image.jpg';
            const result = getOptimizedImageUrl(url, { quality: 60 });

            expect(result).toContain('quality=60');
        });
    });

    describe('generateBlurPlaceholder', () => {
        it('returns a data URL', () => {
            const placeholder = generateBlurPlaceholder();
            expect(placeholder.startsWith('data:image/svg+xml;base64,')).toBe(true);
        });

        it('accepts custom dimensions', () => {
            const placeholder = generateBlurPlaceholder(50, 50);
            expect(placeholder).toBeDefined();
        });
    });

    describe('getVirtualItems', () => {
        const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));

        it('returns correct visible items', () => {
            const result = getVirtualItems(items, 0, {
                itemHeight: 50,
                containerHeight: 200
            });

            expect(result.startIndex).toBe(0);
            expect(result.visibleItems.length).toBeLessThanOrEqual(10); // 200/50 + overscan
        });

        it('calculates correct offset', () => {
            const result = getVirtualItems(items, 500, {
                itemHeight: 50,
                containerHeight: 200
            });

            expect(result.offsetY).toBe(result.startIndex * 50);
        });

        it('handles scroll position', () => {
            const result = getVirtualItems(items, 1000, {
                itemHeight: 50,
                containerHeight: 200
            });

            expect(result.startIndex).toBeGreaterThan(0);
        });

        it('respects overscan', () => {
            const result = getVirtualItems(items, 500, {
                itemHeight: 50,
                containerHeight: 200,
                overscan: 5
            });

            // Should include extra items for smooth scrolling
            expect(result.visibleItems.length).toBeGreaterThan(4);
        });
    });
});

describe('Image Preloading', () => {
    it('preloadImage returns a promise', () => {
        const result = preloadImage('https://example.com/image.jpg');
        expect(result).toBeInstanceOf(Promise);
    });
});
