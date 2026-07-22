import { useCallback } from 'react';
import { hapticLight, hapticMedium, hapticHeavy, hapticSuccess, hapticError } from '../services/haptics';
import {
    playNotificationSound,
    playSuccessSound,
    playErrorSound,
    playMessageSound,
    playReminderSound,
} from '../utils/notificationSound';
import { useIsLowPerformanceDevice } from './useReducedMotion';

// Global AudioContext Singleton
let globalAudioContext: AudioContext | null = null;
let globalGainNode: GainNode | null = null;

const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    if (!globalAudioContext) {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                globalAudioContext = new AudioContextClass();
                globalGainNode = globalAudioContext.createGain();
                globalGainNode.connect(globalAudioContext.destination);
            }
        } catch (_e) {
            // Silent fail
        }
    }
    return { ctx: globalAudioContext, gain: globalGainNode };
};

// Short "pop" / "click" sound using AudioContext

export const useSound = () => {
    const isLowPerf = useIsLowPerformanceDevice();

    const playAudioClick = useCallback(() => {
        if (isLowPerf) return;

        try {
            const audioData = getAudioContext();
            if (!audioData || !audioData.ctx || !audioData.gain) return;
            const { ctx, gain } = audioData;

            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }

            const osc = ctx.createOscillator();
            osc.connect(gain);

            // Very short, high pitch "tick"
            osc.type = 'sine';
            const now = ctx.currentTime;
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);

            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

            osc.start(now);
            osc.stop(now + 0.05);
        } catch (_e) {
            // Silent fail for audio
        }
    }, [isLowPerf]);

    // Combined audio + haptic feedback
    const playClick = useCallback(() => {
        if (isLowPerf) return;
        playAudioClick();
        hapticLight();
    }, [playAudioClick, isLowPerf]);

    // Medium haptic for toggles and confirms
    const playToggle = useCallback(() => {
        if (isLowPerf) return;
        playAudioClick();
        hapticMedium();
    }, [playAudioClick, isLowPerf]);

    // Heavy haptic for important actions
    const playAction = useCallback(() => {
        if (isLowPerf) return;
        playAudioClick();
        hapticHeavy();
    }, [playAudioClick, isLowPerf]);

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

