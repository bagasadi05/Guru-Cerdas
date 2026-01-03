/**
 * Performance Optimization Hooks
 * Auto-detect low-spec devices and manage animations accordingly
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

const REDUCED_MOTION_KEY = 'portal_guru_reduced_motion';
const LOW_PERF_MODE_KEY = 'portal_guru_low_perf_mode';
const DEVICE_CHECK_KEY = 'portal_guru_device_checked';

/**
 * Detect if device is low performance based on hardware specs
 */
function detectLowPerformanceDevice(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

    // Check hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency || 4;

    // Check device memory (RAM in GB) - Chrome only
    // @ts-expect-error - deviceMemory is not in all browsers
    const memory = navigator.deviceMemory || 4;

    // Check connection type for slow network
    // @ts-expect-error - connection is not standard
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isSlowConnection = connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g';

    // Check if mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Check screen size (smaller screens often mean lower-end devices)
    const isSmallScreen = window.innerWidth < 768;

    // Calculate score (lower = worse performance)
    let score = 10;
    if (cores <= 2) score -= 3;
    else if (cores <= 4) score -= 1;

    if (memory <= 2) score -= 3;
    else if (memory <= 4) score -= 1;

    if (isSlowConnection) score -= 2;
    if (isMobile && cores <= 4) score -= 1;
    if (isSmallScreen && isMobile) score -= 1;

    // Consider low performance if score is 6 or below
    return score <= 6;
}

/**
 * Initialize auto-detection on first load
 */
function initializeAutoDetection(): boolean {
    if (typeof window === 'undefined') return false;

    const hasBeenChecked = localStorage.getItem(DEVICE_CHECK_KEY);
    const storedLowPerf = localStorage.getItem(LOW_PERF_MODE_KEY);
    const userPreference = localStorage.getItem(REDUCED_MOTION_KEY);

    if (!hasBeenChecked) {
        const isLowPerf = detectLowPerformanceDevice();
        localStorage.setItem(DEVICE_CHECK_KEY, 'true');

        if (isLowPerf && userPreference === null) {
            // Auto-enable reduced motion for low-perf devices
            document.documentElement.classList.add('reduce-motion');
            localStorage.setItem(LOW_PERF_MODE_KEY, 'true');
            return true;
        }
    }

    return storedLowPerf === 'true';
}

/**
 * Hook to detect if user prefers reduced motion
 * Also includes auto-detection for low-performance devices
 */
export function useReducedMotion() {
    // Initialize auto-detection synchronously on first render
    const [autoLowPerfMode] = useState(() => initializeAutoDetection());

    // Check OS/browser preference
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    // User manual toggle (stored in localStorage)
    const [userPreference, setUserPreference] = useState<boolean | null>(() => {
        if (typeof window === 'undefined') return null;
        const stored = localStorage.getItem(REDUCED_MOTION_KEY);
        return stored !== null ? stored === 'true' : null;
    });

    // Listen for OS preference changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handleChange = (e: MediaQueryListEvent) => {
            setPrefersReducedMotion(e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    // Apply/remove reduce-motion class based on current state
    useEffect(() => {
        const shouldReduce = userPreference !== null ? userPreference : (prefersReducedMotion || autoLowPerfMode);

        if (shouldReduce) {
            document.documentElement.classList.add('reduce-motion');
        } else {
            document.documentElement.classList.remove('reduce-motion');
        }
    }, [userPreference, prefersReducedMotion, autoLowPerfMode]);

    // Final decision: user preference > auto detection > OS preference
    const shouldReduceMotion = useMemo(() => {
        if (userPreference !== null) return userPreference;
        return prefersReducedMotion || autoLowPerfMode;
    }, [userPreference, prefersReducedMotion, autoLowPerfMode]);

    const setReducedMotion = useCallback((value: boolean) => {
        setUserPreference(value);
        localStorage.setItem(REDUCED_MOTION_KEY, String(value));
    }, []);

    const resetToSystemPreference = useCallback(() => {
        setUserPreference(null);
        localStorage.removeItem(REDUCED_MOTION_KEY);
        localStorage.removeItem(LOW_PERF_MODE_KEY);
        localStorage.removeItem(DEVICE_CHECK_KEY);
    }, []);

    return {
        shouldReduceMotion,
        prefersReducedMotion,
        userPreference,
        autoLowPerfMode,
        setReducedMotion,
        resetToSystemPreference,
        isLowPerfDevice: autoLowPerfMode
    };
}

/**
 * Hook to detect if device is likely low-performance
 */
export function useIsLowPerformanceDevice() {
    // Initialize synchronously to avoid flash
    const [isLowPerf] = useState(() => detectLowPerformanceDevice());
    return isLowPerf;
}

/**
 * Get optimized animation props based on device performance
 */
export function getOptimizedAnimationProps(shouldReduceMotion: boolean) {
    if (shouldReduceMotion) {
        return {
            initial: { opacity: 1 },
            animate: { opacity: 1 },
            exit: { opacity: 1 },
            transition: { duration: 0 }
        };
    }
    return {};
}

/**
 * Get optimized Framer Motion variants
 */
export function getOptimizedVariants(shouldReduceMotion: boolean) {
    if (shouldReduceMotion) {
        return {
            initial: { opacity: 1 },
            animate: { opacity: 1 },
            exit: { opacity: 1 }
        };
    }
    return null; // Use default variants
}

export default useReducedMotion;
