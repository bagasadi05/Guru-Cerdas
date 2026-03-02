import { useCallback } from 'react';

/**
 * Custom hook for haptic feedback on mobile devices
 * Provides light, medium, and heavy vibration patterns
 * Falls back gracefully on unsupported devices
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

interface HapticPatterns {
  [key: string]: number[];
}

export const useHaptic = () => {
  const triggerHaptic = useCallback((type: HapticType = 'light') => {
    // Check if vibration API is supported
    if (!('vibrate' in navigator)) {
      return;
    }

    // Define vibration patterns (in milliseconds)
    const patterns: HapticPatterns = {
      light: [10],           // Single short vibration
      medium: [20],          // Single medium vibration
      heavy: [30],           // Single strong vibration
      success: [10, 50, 10], // Double tap pattern
      warning: [15, 100, 15, 100, 15], // Triple tap pattern
      error: [50, 50, 50],   // Long triple vibration
    };

    // Trigger vibration
    try {
      navigator.vibrate(patterns[type] || patterns.light);
    } catch (error) {
      // Silently fail on unsupported patterns
      console.debug('Haptic feedback not available:', error);
    }
  }, []);

  // Check if haptics are available
  const isHapticAvailable = 'vibrate' in navigator;

  return {
    triggerHaptic,
    isHapticAvailable,
  };
};
