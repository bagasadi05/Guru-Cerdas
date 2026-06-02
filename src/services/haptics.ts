/**
 * Haptic Feedback Service
 * Provides haptic feedback for native mobile platforms using Capacitor Haptics
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { logger } from './logger';

/**
 * Check if running on native platform
 */
const isNative = (): boolean => Capacitor.isNativePlatform();

/**
 * Light impact - for subtle feedback (button taps, selections)
 */
export const hapticLight = async (): Promise<void> => {
    if (!isNative()) return;
    try {
        await Haptics.impact({ style: ImpactStyle.Light });
    } catch (_e) {
        logger.warn('Haptics not available', 'Haptics');
    }
};

/**
 * Medium impact - for confirmations, toggle switches
 */
export const hapticMedium = async (): Promise<void> => {
    if (!isNative()) return;
    try {
        await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (_e) {
        logger.warn('Haptics not available', 'Haptics');
    }
};

/**
 * Heavy impact - for important actions (delete, submit)
 */
export const hapticHeavy = async (): Promise<void> => {
    if (!isNative()) return;
    try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (_e) {
        logger.warn('Haptics not available', 'Haptics');
    }
};

/**
 * Success notification haptic
 */
export const hapticSuccess = async (): Promise<void> => {
    if (!isNative()) return;
    try {
        await Haptics.notification({ type: NotificationType.Success });
    } catch (_e) {
        logger.warn('Haptics not available', 'Haptics');
    }
};

/**
 * Warning notification haptic
 */
export const hapticWarning = async (): Promise<void> => {
    if (!isNative()) return;
    try {
        await Haptics.notification({ type: NotificationType.Warning });
    } catch (_e) {
        logger.warn('Haptics not available', 'Haptics');
    }
};

/**
 * Error notification haptic
 */
export const hapticError = async (): Promise<void> => {
    if (!isNative()) return;
    try {
        await Haptics.notification({ type: NotificationType.Error });
    } catch (_e) {
        logger.warn('Haptics not available', 'Haptics');
    }
};

/**
 * Selection changed haptic - for picker/scroll selection changes
 */
export const hapticSelection = async (): Promise<void> => {
    if (!isNative()) return;
    try {
        await Haptics.selectionStart();
        await Haptics.selectionChanged();
        await Haptics.selectionEnd();
    } catch (_e) {
        logger.warn('Haptics not available', 'Haptics');
    }
};

/**
 * Vibrate for a specific duration (Android only)
 */
export const vibrate = async (duration: number = 100): Promise<void> => {
    if (!isNative()) return;
    try {
        await Haptics.vibrate({ duration });
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
