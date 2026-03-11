import { useCallback } from 'react';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

const hapticPatterns: Record<HapticType, number[]> = {
    light: [10],
    medium: [25],
    heavy: [50],
    success: [10, 50, 10],
    warning: [30, 30, 30],
    error: [50, 100, 50],
    selection: [5]
};

export function useHapticFeedback() {
    const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

    const vibrate = useCallback((type: HapticType = 'light') => {
        if (!isSupported) return false;

        const pattern = hapticPatterns[type] ?? hapticPatterns.light;
        return navigator.vibrate(pattern);
    }, [isSupported]);

    const vibratePattern = useCallback((pattern: number[]) => {
        if (!isSupported) return false;
        return navigator.vibrate(pattern);
    }, [isSupported]);

    const stop = useCallback(() => {
        if (!isSupported) return;
        navigator.vibrate(0);
    }, [isSupported]);

    return {
        isSupported,
        vibrate,
        vibratePattern,
        stop,
        light: () => vibrate('light'),
        medium: () => vibrate('medium'),
        heavy: () => vibrate('heavy'),
        success: () => vibrate('success'),
        warning: () => vibrate('warning'),
        error: () => vibrate('error'),
        selection: () => vibrate('selection')
    };
}
