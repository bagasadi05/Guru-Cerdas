/**
 * Web fallback implementation for RingtonePicker
 * 
 * Provides a graceful degradation on web/non-Android platforms.
 * Uses the existing built-in sounds from notificationSoundSettings.
 */

import { WebPlugin } from '@capacitor/core';
import type { RingtonePickerPlugin, GetSoundsResult, PickerResult, PickerOptions } from './RingtonePicker';
import { SOUND_OPTIONS, previewSound } from '../services/notificationSoundSettings';

export class RingtonePickerWeb extends WebPlugin implements RingtonePickerPlugin {

    /**
     * On web, return the built-in app sounds as "notification sounds"
     */
    async getNotificationSounds(): Promise<GetSoundsResult> {
        const sounds = SOUND_OPTIONS
            .filter(s => s.id !== 'custom' && s.id !== 'none')
            .map((s, index) => ({
                id: index,
                title: s.name,
                uri: `app://sound/${s.id}`,
                type: 'notification' as const,
                isDefault: s.id === 'default',
            }));

        return {
            sounds,
            defaultSound: sounds.find(s => s.isDefault),
        };
    }

    /**
     * Same as notification sounds for web
     */
    async getRingtones(): Promise<GetSoundsResult> {
        return this.getNotificationSounds();
    }

    /**
     * Preview using the existing web audio implementation
     */
    async previewSound(options: { uri: string }): Promise<void> {
        // Parse the app:// URI to get the sound ID
        const match = options.uri.match(/app:\/\/sound\/(.+)/);
        if (match) {
            const soundId = match[1] as any;
            previewSound(soundId);
        }
    }

    /**
     * No-op on web
     */
    async stopPreview(): Promise<void> {
        // Web audio stops automatically
    }

    /**
     * On web, show a simple alert since we can't use system picker
     */
    async openPicker(_options?: PickerOptions): Promise<PickerResult> {
        // Return cancelled since web doesn't have a picker
        console.warn('RingtonePicker: System picker not available on web. Use the in-app sound picker instead.');
        return {
            uri: null,
            cancelled: true,
        };
    }

    /**
     * Return the default app sound
     */
    async getDefaultSound(): Promise<{ uri: string; title?: string }> {
        return {
            uri: 'app://sound/default',
            title: 'Ding Dong',
        };
    }
}
