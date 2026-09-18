/**
 * Synthesizes gentle audio feedback using browser Web Audio API.
 * Works 100% offline, zero external sound assets needed.
 */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return null;
    if (!audioCtx) {
        audioCtx = new AudioCtxClass();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}

/**
 * Plays a gentle short chime when a grade is successfully recognized and filled.
 */
export function playSuccessChime() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        // Gentle pleasant pitch upward (784Hz -> 988Hz)
        osc.frequency.setValueAtTime(784, now);
        osc.frequency.exponentialRampToValueAtTime(988, now + 0.1);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.22);
    } catch {
        // Silent fail if audio playback is blocked by browser policy
    }
}

/**
 * Plays a soft neutral notification tone for voice commands (skip/back/clear).
 */
export function playCommandTone() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
    } catch {
        // Silent fail
    }
}

/**
 * Plays a gentle low warning tone when an invalid input occurs (e.g. score > 100).
 */
export function playErrorTone() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.18);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
    } catch {
        // Silent fail
    }
}

