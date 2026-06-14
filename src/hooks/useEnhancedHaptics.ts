/**
 * Enhanced Haptic Feedback Hook (PWA / Web only)
 * Provides pattern-based haptic feedback using the web Vibration API.
 * Silent failure for devices without vibration support.
 */

import { useCallback, useMemo } from 'react';

/**
 * Interface for haptic pattern methods
 */
export interface HapticPatterns {
  tap: () => Promise<void>;
  select: () => Promise<void>;
  success: () => Promise<void>;
  warning: () => Promise<void>;
  error: () => Promise<void>;
}

const vibrateIfSupported = (pattern: number | number[]): void => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

/**
 * Light tap haptic - for button taps and interactive element presses
 * Web: vibrate([10])
 */
export const hapticTap = async (): Promise<void> => {
  try {
    vibrateIfSupported([10]);
  } catch {
    // Silent fail for devices without vibration support
  }
};

/**
 * Medium select haptic - for list item selection
 * Web: vibrate([20])
 */
export const hapticSelect = async (): Promise<void> => {
  try {
    vibrateIfSupported([20]);
  } catch {
    // Silent fail for devices without vibration support
  }
};

/**
 * Success haptic - for completed actions (save, submit)
 * Web: vibrate([10, 50, 10])
 */
export const hapticSuccess = async (): Promise<void> => {
  try {
    vibrateIfSupported([10, 50, 10]);
  } catch {
    // Silent fail for devices without vibration support
  }
};

/**
 * Warning haptic - for actions that require attention but are not critical
 * Web: vibrate([15, 100, 15, 100, 15])
 */
export const hapticWarning = async (): Promise<void> => {
  try {
    vibrateIfSupported([15, 100, 15, 100, 15]);
  } catch {
    // Silent fail for devices without vibration support
  }
};

/**
 * Error haptic - for error occurrences
 * Web: vibrate([50, 50, 50])
 */
export const hapticError = async (): Promise<void> => {
  try {
    vibrateIfSupported([50, 50, 50]);
  } catch {
    // Silent fail for devices without vibration support
  }
};

/**
 * React hook that provides pattern-based haptic feedback methods.
 * Returns memoized haptic pattern functions for use in components.
 *
 * @example
 * ```tsx
 * const haptics = useEnhancedHaptics();
 *
 * const handleSave = async () => {
 *   await saveData();
 *   await haptics.success();
 * };
 *
 * const handleTap = () => {
 *   haptics.tap();
 * };
 * ```
 */
export function useEnhancedHaptics(): HapticPatterns {
  const tap = useCallback(() => hapticTap(), []);
  const select = useCallback(() => hapticSelect(), []);
  const success = useCallback(() => hapticSuccess(), []);
  const warning = useCallback(() => hapticWarning(), []);
  const error = useCallback(() => hapticError(), []);

  return useMemo(
    () => ({ tap, select, success, warning, error }),
    [tap, select, success, warning, error]
  );
}

export default useEnhancedHaptics;
