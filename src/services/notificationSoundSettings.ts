/**
 * Notification Sound Settings Service
 * 
 * Manages notification sound preferences for Portal Guru.
 * Supports built-in sounds and custom user-uploaded sounds.
 */

import {
    playNotificationSound,
    playSuccessSound,
    playErrorSound,
    playMessageSound,
    playReminderSound,
} from '../utils/notificationSound';

/**
 * Available built-in sound types
 */
export type SoundType = 'default' | 'chime' | 'bell' | 'pop' | 'gentle' | 'custom' | 'system' | 'none';

/**
 * Sound option configuration
 */
export interface SoundOption {
    id: SoundType;
    name: string;
    description: string;
    icon: string;
    isNative?: boolean;
}

/**
 * Available built-in sounds
 */
export const SOUND_OPTIONS: SoundOption[] = [
    {
        id: 'default',
        name: 'Ding Dong',
        description: 'Nada klasik dua ketukan',
        icon: '🔔',
    },
    {
        id: 'chime',
        name: 'Chime',
        description: 'Nada manis ascending',
        icon: '✨',
    },
    {
        id: 'bell',
        name: 'Lonceng',
        description: 'Seperti lonceng sekolah',
        icon: '🎵',
    },
    {
        id: 'pop',
        name: 'Pop',
        description: 'Nada singkat dan ceria',
        icon: '💬',
    },
    {
        id: 'gentle',
        name: 'Lembut',
        description: 'Pengingat yang halus',
        icon: '🌸',
    },
    {
        id: 'system',
        name: 'Ringtone HP',
        description: 'Pilih dari nada sistem',
        icon: '📱',
        isNative: true,
    },
    {
        id: 'custom',
        name: 'Custom',
        description: 'Upload nada sendiri',
        icon: '📁',
    },
    {
        id: 'none',
        name: 'Tanpa Suara',
        description: 'Notifikasi diam',
        icon: '🔇',
    },
];

/**
 * Storage keys
 */
const STORAGE_KEYS = {
    SCHEDULE_SOUND: 'portal_guru_schedule_sound',
    MESSAGE_SOUND: 'portal_guru_message_sound',
    CUSTOM_SOUND_URL: 'portal_guru_custom_sound_url',
    SOUND_VOLUME: 'portal_guru_sound_volume',
};

/**
 * Audio context for custom sounds
 */
let customAudioElement: HTMLAudioElement | null = null;

/**
 * Get the selected schedule notification sound
 */
export const getScheduleSound = (): SoundType => {
    return (localStorage.getItem(STORAGE_KEYS.SCHEDULE_SOUND) as SoundType) || 'default';
};

/**
 * Set the schedule notification sound preference
 */
export const setScheduleSound = (soundType: SoundType): void => {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE_SOUND, soundType);
};

/**
 * Get the selected message notification sound
 */
export const getMessageSound = (): SoundType => {
    return (localStorage.getItem(STORAGE_KEYS.MESSAGE_SOUND) as SoundType) || 'pop';
};

/**
 * Set the message notification sound preference
 */
export const setMessageSound = (soundType: SoundType): void => {
    localStorage.setItem(STORAGE_KEYS.MESSAGE_SOUND, soundType);
};

/**
 * Get the notification volume (0-1)
 */
export const getSoundVolume = (): number => {
    const stored = localStorage.getItem(STORAGE_KEYS.SOUND_VOLUME);
    return stored ? parseFloat(stored) : 0.7;
};

/**
 * Set the notification volume
 */
export const setSoundVolume = (volume: number): void => {
    localStorage.setItem(STORAGE_KEYS.SOUND_VOLUME, volume.toString());
};

/**
 * Get custom sound URL from storage
 */
export const getCustomSoundUrl = (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.CUSTOM_SOUND_URL);
};

/**
 * Store custom sound as base64 data URL
 */
export const setCustomSound = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
        // Validate file type
        if (!file.type.startsWith('audio/')) {
            reject(new Error('File harus berupa audio'));
            return;
        }

        // Validate file size (max 1MB)
        if (file.size > 1024 * 1024) {
            reject(new Error('Ukuran file maksimal 1MB'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            localStorage.setItem(STORAGE_KEYS.CUSTOM_SOUND_URL, dataUrl);
            resolve();
        };
        reader.onerror = () => reject(new Error('Gagal membaca file'));
        reader.readAsDataURL(file);
    });
};

/**
 * Clear custom sound
 */
export const clearCustomSound = (): void => {
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_SOUND_URL);
};

/**
 * Play a preview of the selected sound
 */
export const previewSound = (soundType: SoundType): void => {
    switch (soundType) {
        case 'default':
            playNotificationSound();
            break;
        case 'chime':
            playSuccessSound();
            break;
        case 'bell':
            playReminderSound();
            break;
        case 'pop':
            playMessageSound();
            break;
        case 'gentle':
            playGentleSound();
            break;
        case 'custom':
            playCustomSound();
            break;
        case 'system':
            playSystemSound();
            break;
        case 'none':
            // Do nothing
            break;
    }
};

/**
 * Play the actual notification based on context
 */
export const playScheduleNotification = (): void => {
    const soundType = getScheduleSound();
    if (soundType !== 'none') {
        previewSound(soundType);
    }
};

/**
 * Play a gentle notification sound
 */
const playGentleSound = (): void => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.setValueAtTime(0.2, now);

    // Soft, warm single tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(masterGain);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.exponentialRampToValueAtTime(330, now + 0.5);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.start(now);
    osc.stop(now + 0.6);
};

/**
 * Play custom uploaded sound
 */
const playCustomSound = (): void => {
    const customUrl = getCustomSoundUrl();
    if (!customUrl) {
        // Fallback to default if no custom sound set
        playNotificationSound();
        return;
    }

    try {
        // Stop previous custom audio if playing
        if (customAudioElement) {
            customAudioElement.pause();
            customAudioElement.currentTime = 0;
        }

        customAudioElement = new Audio(customUrl);
        customAudioElement.volume = getSoundVolume();
        customAudioElement.play().catch(e => {
            console.warn('Could not play custom sound:', e);
            // Fallback to default
            playNotificationSound();
        });
    } catch (e) {
        console.warn('Error playing custom sound:', e);
        playNotificationSound();
    }
};

/**
 * Play system ringtone (Android only)
 * Uses the native RingtonePicker plugin to play the saved system sound
 */
const playSystemSound = async (): Promise<void> => {
    const uri = localStorage.getItem('portal_guru_system_ringtone_uri');

    if (!uri) {
        // Fallback to default if no system sound selected
        playNotificationSound();
        return;
    }

    try {
        // Dynamic import to avoid issues on web
        const { default: RingtonePicker } = await import('../plugins/RingtonePicker');
        await RingtonePicker.previewSound({ uri });
    } catch (e) {
        console.warn('Could not play system sound, falling back to default:', e);
        playNotificationSound();
    }
};

export default {
    SOUND_OPTIONS,
    getScheduleSound,
    setScheduleSound,
    getMessageSound,
    setMessageSound,
    getSoundVolume,
    setSoundVolume,
    getCustomSoundUrl,
    setCustomSound,
    clearCustomSound,
    previewSound,
    playScheduleNotification,
};
