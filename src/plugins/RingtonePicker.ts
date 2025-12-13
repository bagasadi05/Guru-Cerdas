/**
 * Capacitor Native Ringtone Picker Plugin
 * 
 * TypeScript definitions and wrapper for accessing Android system ringtones.
 * Falls back to web audio API on non-Android platforms.
 */

import { registerPlugin } from '@capacitor/core';

/**
 * Represents a system ringtone/notification sound
 */
export interface SystemSound {
    id: number;
    title: string;
    uri: string;
    type: 'notification' | 'ringtone' | 'alarm';
    isDefault?: boolean;
}

/**
 * Result from getSounds methods
 */
export interface GetSoundsResult {
    sounds: SystemSound[];
    defaultSound?: SystemSound;
}

/**
 * Result from openPicker
 */
export interface PickerResult {
    uri: string | null;
    title?: string;
    cancelled: boolean;
    isSilent?: boolean;
}

/**
 * Options for openPicker
 */
export interface PickerOptions {
    type?: 'notification' | 'ringtone' | 'alarm';
    currentUri?: string;
    title?: string;
}

/**
 * Plugin interface
 */
export interface RingtonePickerPlugin {
    /**
     * Get list of all notification sounds from system
     */
    getNotificationSounds(): Promise<GetSoundsResult>;

    /**
     * Get list of all ringtones from system
     */
    getRingtones(): Promise<GetSoundsResult>;

    /**
     * Preview a sound by its URI
     */
    previewSound(options: { uri: string }): Promise<void>;

    /**
     * Stop current preview playback
     */
    stopPreview(): Promise<void>;

    /**
     * Open the system ringtone picker dialog
     */
    openPicker(options?: PickerOptions): Promise<PickerResult>;

    /**
     * Get the default notification sound URI
     */
    getDefaultSound(): Promise<{ uri: string; title?: string }>;
}

/**
 * Register the native plugin
 */
const RingtonePicker = registerPlugin<RingtonePickerPlugin>('RingtonePicker', {
    web: () => import('./RingtonePickerWeb').then(m => new m.RingtonePickerWeb()),
});

export default RingtonePicker;

// Also export individually for convenience
export { RingtonePicker };
