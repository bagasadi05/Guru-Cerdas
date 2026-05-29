/**
 * Enhanced Haptic Feedback Hook
 * Provides pattern-based haptic feedback with native and web fallback support.
 *
 * Native (Capacitor): Uses Haptics.impact() and Haptics.notification() APIs
 * Web fallback: Uses navigator.vibrate() with pattern arrays
 * Silent failure: All methods wrapped in try/catch for unsupported devices
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
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

const isNative = (): boolean => Capacitor.isNativePlatform();

/**
 * Light tap haptic - for button taps and interactive element presses
 * Native: ImpactStyle.Light | Web: vibrate([10])
 */
export const hapticTap = async (): Promise<void> => {
  try {
    if (isNative()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if (navigator?.vibrate) {
      navigator.vibrate([10]);
    }
  } catch {
    // Silent fail for devices without vibration support
  }
};

/**
 * Medium select haptic - for list item selection
 * Native: ImpactStyle.Medium | Web: vibrate([20])
 */
export const hapticSelect = async (): Promise<void> => {
  try {
    if (isNative()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else if (navigator?.vibrate) {
      navigator.vibrate([20]);
    }
  } catch {
    // Silent fail for devices without vibration support
  }
};

/**
 * Success haptic - for completed actions (save, submit)
 * Native: NotificationType.Success | Web: vibrate([10, 50, 10])
 */
export const hapticSuccess = async (): Promise<void> => {
  try {
    if (isNative()) {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (navigator?.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }
  } catch {
    // Silent fail for devices without vibration support
  }
};

/**
 * Warning haptic - for actions that require attention but are not critical
 * Native: NotificationType.Warning | Web: vibrate([15, 100, 15, 100, 15])
 */
export const hapticWarning = async (): Promise<void> => {
  try {
    if (isNative()) {
      await Haptics.notification({ type: NotificationType.Warning });
    } else if (navigator?.vibrate) {
      navigator.vibrate([15, 100, 15, 100, 15]);
    }
  } catch {
    // Silent fail for devices without vibration support
  }
};

/**
 * Error haptic - for error occurrences
 * Native: NotificationType.Error | Web: vibrate([50, 50, 50])
 */
export const hapticError = async (): Promise<void> => {
  try {
    if (isNative()) {
      await Haptics.notification({ type: NotificationType.Error });
    } else if (navigator?.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
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
