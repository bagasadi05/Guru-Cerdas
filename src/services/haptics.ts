/**
 * Haptic Feedback Service (PWA / Web only)
 * Provides haptic feedback via the Web Vibration API.
 */

import { logger } from './logger';

const vibrateIfSupported = (pattern: number | number[]): void => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

/**
 * Light impact - for subtle feedback (button taps, selections)
 */
export const hapticLight = async (): Promise<void> => {
  try {
    vibrateIfSupported([10]);
  } catch (_e) {
    logger.warn('Haptics not available', 'Haptics');
  }
};

/**
 * Medium impact - for confirmations, toggle switches
 */
export const hapticMedium = async (): Promise<void> => {
  try {
    vibrateIfSupported([20]);
  } catch (_e) {
    logger.warn('Haptics not available', 'Haptics');
  }
};

/**
 * Heavy impact - for important actions (delete, submit)
 */
export const hapticHeavy = async (): Promise<void> => {
  try {
    vibrateIfSupported([30]);
  } catch (_e) {
    logger.warn('Haptics not available', 'Haptics');
  }
};

/**
 * Success notification haptic
 */
export const hapticSuccess = async (): Promise<void> => {
  try {
    vibrateIfSupported([10, 50, 10]);
  } catch (_e) {
    logger.warn('Haptics not available', 'Haptics');
  }
};

/**
 * Warning notification haptic
 */
export const hapticWarning = async (): Promise<void> => {
  try {
    vibrateIfSupported([15, 100, 15, 100, 15]);
  } catch (_e) {
    logger.warn('Haptics not available', 'Haptics');
  }
};

/**
 * Error notification haptic
 */
export const hapticError = async (): Promise<void> => {
  try {
    vibrateIfSupported([50, 50, 50]);
  } catch (_e) {
    logger.warn('Haptics not available', 'Haptics');
  }
};

/**
 * Selection changed haptic - for picker/scroll selection changes
 */
export const hapticSelection = async (): Promise<void> => {
  try {
    vibrateIfSupported([5]);
  } catch (_e) {
    logger.warn('Haptics not available', 'Haptics');
  }
};

/**
 * Vibrate for a specific duration
 */
export const vibrate = async (duration: number = 100): Promise<void> => {
  try {
    vibrateIfSupported(duration);
  } catch (_e) {
    logger.warn('Haptics not available', 'Haptics');
  }
};

// Export all haptic functions
export const haptics = {
  light: hapticLight,
  medium: hapticMedium,
  heavy: hapticHeavy,
  success: hapticSuccess,
  warning: hapticWarning,
  error: hapticError,
  selection: hapticSelection,
  vibrate,
};

export default haptics;
