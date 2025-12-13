import { useCallback } from 'react';
import { hapticLight, hapticMedium, hapticHeavy, hapticSuccess, hapticError } from '../services/haptics';
import {
    playNotificationSound,
    playSuccessSound,
    playErrorSound,
    playMessageSound,
    playReminderSound,
} from '../utils/notificationSound';

// Short "pop" / "click" sound using AudioContext

export const useSound = () => {
    const playAudioClick = useCallback(() => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            // Very short, high pitch "tick"
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.05);
        } catch (e) {
            // Silent fail for audio
        }
    }, []);

    // Combined audio + haptic feedback
    const playClick = useCallback(() => {
        playAudioClick();
        hapticLight();
    }, [playAudioClick]);

    // Medium haptic for toggles and confirms
    const playToggle = useCallback(() => {
        playAudioClick();
        hapticMedium();
    }, [playAudioClick]);

    // Heavy haptic for important actions
    const playAction = useCallback(() => {
        playAudioClick();
        hapticHeavy();
    }, [playAudioClick]);

    // Success feedback with sound and haptic
    const playSuccess = useCallback(() => {
        playSuccessSound();
        hapticSuccess();
    }, []);

    // Error feedback with sound and haptic
    const playError = useCallback(() => {
        playErrorSound();
        hapticError();
    }, []);

    // Notification sound (ding-dong) with haptic
    const playNotification = useCallback(() => {
        playNotificationSound();
        hapticMedium();
    }, []);

    // Message received sound with haptic
    const playMessage = useCallback(() => {
        playMessageSound();
        hapticLight();
    }, []);

    // Reminder sound with haptic
    const playReminder = useCallback(() => {
        playReminderSound();
        hapticHeavy();
    }, []);

    return {
        playClick,
        playToggle,
        playAction,
        playSuccess,
        playError,
        // New notification sounds
        playNotification,
        playMessage,
        playReminder,
        // Also expose individual haptics
        hapticLight,
        hapticMedium,
        hapticHeavy,
        // Expose raw sound functions for direct use
        sounds: {
            notification: playNotificationSound,
            success: playSuccessSound,
            error: playErrorSound,
            message: playMessageSound,
            reminder: playReminderSound,
        },
    };
};

