/**
 * Haptic Feedback Service
 * Provides haptic feedback for native mobile platforms using Capacitor Haptics
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

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
    } catch (e) {
        console.log('Haptics not available');
    }
};

/**
 * Medium impact - for confirmations, toggle switches
 */
export const hapticMedium = async (): Promise<void> => {
    if (!isNative()) return;
    try {
        await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
        console.log('Haptics not available');
    }
};

/**
 * Heavy impact - for important actions (delete, submit)
 */
export const hapticHeavy = async (): Promise<void> => {
    if (!isNative()) return;
    try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
        console.log('Haptics not available');
    }
};

/**
 * Success notification haptic
 */
export const hapticSuccess = async (): Promise<void> => {
    if (!isNative()) return;
    try {
        await Haptics.notification({ type: NotificationType.Success });
    } catch (e) {
        console.log('Haptics not available');
    }
};

/**
 * Warning notification haptic
 */
export const hapticWarning = async (): Promise<void> => {
    if (!isNative()) return;
    try {
        await Haptics.notification({ type: NotificationType.Warning });
    } catch (e) {
        console.log('Haptics not available');
    }
};

/**
 * Error notification haptic
 */
export const hapticError = async (): Promise<void> => {
    if (!isNative()) return;
    try {
        await Haptics.notification({ type: NotificationType.Error });
    } catch (e) {
        console.log('Haptics not available');
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
    } catch (e) {
        console.log('Haptics not available');
    }
};

/**
 * Vibrate for a specific duration (Android only)
 */
export const vibrate = async (duration: number = 100): Promise<void> => {
    if (!isNative()) return;
    try {
        await Haptics.vibrate({ duration });
    } catch (e) {
        console.log('Haptics not available');
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
