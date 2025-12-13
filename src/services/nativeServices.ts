/**
 * Capacitor Native Services
 * 
 * Centralized wrapper for all Capacitor plugins.
 * Provides easy-to-use functions with web fallbacks.
 */

import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Device } from '@capacitor/device';
import { Clipboard } from '@capacitor/clipboard';
import { Toast } from '@capacitor/toast';
import { Browser } from '@capacitor/browser';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { FilePicker } from '@capawesome/capacitor-file-picker';

/**
 * Check if running on native platform
 */
export const isNative = () => Capacitor.isNativePlatform();
export const isAndroid = () => Capacitor.getPlatform() === 'android';
export const isIOS = () => Capacitor.getPlatform() === 'ios';
export const isWeb = () => Capacitor.getPlatform() === 'web';

// ============================================
// CAMERA SERVICES
// ============================================

/**
 * Take a photo using the camera
 */
export const takePhoto = async (): Promise<string | null> => {
    try {
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: true,
            resultType: CameraResultType.Base64,
            source: CameraSource.Camera,
        });
        return image.base64String ? `data:image/jpeg;base64,${image.base64String}` : null;
    } catch (e) {
        console.warn('Camera error:', e);
        return null;
    }
};

/**
 * Pick an image from gallery
 */
export const pickImage = async (): Promise<string | null> => {
    try {
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: true,
            resultType: CameraResultType.Base64,
            source: CameraSource.Photos,
        });
        return image.base64String ? `data:image/jpeg;base64,${image.base64String}` : null;
    } catch (e) {
        console.warn('Gallery error:', e);
        return null;
    }
};

// ============================================
// SHARE SERVICES
// ============================================

interface ShareOptions {
    title?: string;
    text?: string;
    url?: string;
    dialogTitle?: string;
}

/**
 * Share content using native share dialog
 */
export const shareContent = async (options: ShareOptions): Promise<boolean> => {
    try {
        await Share.share({
            title: options.title,
            text: options.text,
            url: options.url,
            dialogTitle: options.dialogTitle || 'Bagikan',
        });
        return true;
    } catch (e) {
        console.warn('Share error:', e);
        return false;
    }
};

/**
 * Share text via WhatsApp (common use case)
 */
export const shareToWhatsApp = async (text: string, phone?: string): Promise<boolean> => {
    const url = phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;

    return shareContent({ url, title: 'Bagikan via WhatsApp' });
};

// ============================================
// FILESYSTEM SERVICES
// ============================================

/**
 * Save text file to device
 */
export const saveTextFile = async (filename: string, content: string): Promise<string | null> => {
    try {
        const result = await Filesystem.writeFile({
            path: filename,
            data: content,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
        });
        return result.uri;
    } catch (e) {
        console.warn('Filesystem write error:', e);
        return null;
    }
};

/**
 * Read text file from device
 */
export const readTextFile = async (filename: string): Promise<string | null> => {
    try {
        const result = await Filesystem.readFile({
            path: filename,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
        });
        return result.data as string;
    } catch (e) {
        console.warn('Filesystem read error:', e);
        return null;
    }
};

/**
 * Save base64 data as file (e.g., PDF, image)
 */
export const saveBase64File = async (filename: string, base64Data: string): Promise<string | null> => {
    try {
        const result = await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: Directory.Documents,
        });
        return result.uri;
    } catch (e) {
        console.warn('Filesystem write error:', e);
        return null;
    }
};

// ============================================
// PREFERENCES (SECURE STORAGE)
// ============================================

/**
 * Save value to secure preferences
 */
export const setPreference = async (key: string, value: string): Promise<void> => {
    await Preferences.set({ key, value });
};

/**
 * Get value from secure preferences
 */
export const getPreference = async (key: string): Promise<string | null> => {
    const result = await Preferences.get({ key });
    return result.value;
};

/**
 * Remove value from secure preferences
 */
export const removePreference = async (key: string): Promise<void> => {
    await Preferences.remove({ key });
};

// ============================================
// DEVICE INFO
// ============================================

/**
 * Get device information
 */
export const getDeviceInfo = async () => {
    return await Device.getInfo();
};

/**
 * Get unique device ID
 */
export const getDeviceId = async (): Promise<string> => {
    const info = await Device.getId();
    return info.identifier;
};

/**
 * Get battery info
 */
export const getBatteryInfo = async () => {
    return await Device.getBatteryInfo();
};

// ============================================
// CLIPBOARD
// ============================================

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<void> => {
    await Clipboard.write({ string: text });
};

/**
 * Read text from clipboard
 */
export const readFromClipboard = async (): Promise<string> => {
    const result = await Clipboard.read();
    return result.value;
};

// ============================================
// TOAST NOTIFICATIONS
// ============================================

/**
 * Show native toast message
 */
export const showToast = async (text: string, duration: 'short' | 'long' = 'short'): Promise<void> => {
    await Toast.show({
        text,
        duration,
        position: 'bottom',
    });
};

// ============================================
// BROWSER
// ============================================

/**
 * Open URL in system browser
 */
export const openInBrowser = async (url: string): Promise<void> => {
    await Browser.open({ url });
};

/**
 * Open URL in in-app browser
 */
export const openInAppBrowser = async (url: string): Promise<void> => {
    await Browser.open({
        url,
        presentationStyle: 'popover',
    });
};

// ============================================
// SCREEN ORIENTATION
// ============================================

/**
 * Lock screen to portrait mode
 */
export const lockPortrait = async (): Promise<void> => {
    await ScreenOrientation.lock({ orientation: 'portrait' });
};

/**
 * Lock screen to landscape mode
 */
export const lockLandscape = async (): Promise<void> => {
    await ScreenOrientation.lock({ orientation: 'landscape' });
};

/**
 * Unlock screen orientation
 */
export const unlockOrientation = async (): Promise<void> => {
    await ScreenOrientation.unlock();
};

// ============================================
// FILE PICKER
// ============================================

/**
 * Pick a file from device
 */
export const pickFile = async (types?: string[]): Promise<{ name: string; data: string; mimeType: string } | null> => {
    try {
        // Use type assertion since FilePicker API varies by version
        const result = await (FilePicker as any).pickFiles({
            types: types || ['application/pdf', 'image/*', 'audio/*'],
            readData: true,
            limit: 1,
        });

        if (result.files && result.files.length > 0) {
            const file = result.files[0];
            return {
                name: file.name || 'file',
                data: file.data || '',
                mimeType: file.mimeType || 'application/octet-stream',
            };
        }
        return null;
    } catch (e) {
        console.warn('File picker error:', e);
        return null;
    }
};

/**
 * Pick multiple files
 */
export const pickMultipleFiles = async (types?: string[]) => {
    try {
        // Use type assertion since FilePicker API varies by version
        const result = await (FilePicker as any).pickFiles({
            types: types || ['application/pdf', 'image/*'],
            multiple: true,
            readData: true,
        });
        return result.files || [];
    } catch (e) {
        console.warn('File picker error:', e);
        return [];
    }
};

// ============================================
// EXPORT ALL
// ============================================

export default {
    // Platform checks
    isNative,
    isAndroid,
    isIOS,
    isWeb,

    // Camera
    takePhoto,
    pickImage,

    // Share
    shareContent,
    shareToWhatsApp,

    // Filesystem
    saveTextFile,
    readTextFile,
    saveBase64File,

    // Preferences
    setPreference,
    getPreference,
    removePreference,

    // Device
    getDeviceInfo,
    getDeviceId,
    getBatteryInfo,

    // Clipboard
    copyToClipboard,
    readFromClipboard,

    // Toast
    showToast,

    // Browser
    openInBrowser,
    openInAppBrowser,

    // Screen Orientation
    lockPortrait,
    lockLandscape,
    unlockOrientation,

    // File Picker
    pickFile,
    pickMultipleFiles,
};
