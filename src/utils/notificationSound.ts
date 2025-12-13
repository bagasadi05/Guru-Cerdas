/**
 * Custom Notification Sound Generator for Portal Guru
 * 
 * Creates a unique, pleasant "ding-dong" sound using Web Audio API
 * This sound is distinctive and professional, perfect for education apps
 */

// Audio context singleton
let audioContext: AudioContext | null = null;

/**
 * Get or create the AudioContext
 */
const getAudioContext = (): AudioContext | null => {
    if (!audioContext) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            audioContext = new AudioContextClass();
        }
    }
    return audioContext;
};

/**
 * Play a pleasant two-tone notification sound (ding-dong style)
 * Perfect for Portal Guru's educational theme
 */
export const playNotificationSound = (): void => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        // Resume context if suspended
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;

        // Create master gain for volume control
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.setValueAtTime(0.3, now);

        // === FIRST TONE (Higher pitch "Ding") ===
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();

        osc1.connect(gain1);
        gain1.connect(masterGain);

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now); // A5 note
        osc1.frequency.exponentialRampToValueAtTime(660, now + 0.15); // Slight pitch drop

        gain1.gain.setValueAtTime(0.4, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc1.start(now);
        osc1.stop(now + 0.4);

        // Add harmonics for richness
        const osc1Harmonic = ctx.createOscillator();
        const gain1Harmonic = ctx.createGain();

        osc1Harmonic.connect(gain1Harmonic);
        gain1Harmonic.connect(masterGain);

        osc1Harmonic.type = 'sine';
        osc1Harmonic.frequency.setValueAtTime(1760, now); // Octave higher

        gain1Harmonic.gain.setValueAtTime(0.1, now);
        gain1Harmonic.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc1Harmonic.start(now);
        osc1Harmonic.stop(now + 0.3);

        // === SECOND TONE (Lower pitch "Dong") ===
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();

        osc2.connect(gain2);
        gain2.connect(masterGain);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(660, now + 0.15); // E5 note
        osc2.frequency.exponentialRampToValueAtTime(440, now + 0.5); // Drop to A4

        gain2.gain.setValueAtTime(0, now);
        gain2.gain.setValueAtTime(0.3, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

        osc2.start(now + 0.15);
        osc2.stop(now + 0.6);

        // Add sub-bass for fullness
        const subBass = ctx.createOscillator();
        const subBassGain = ctx.createGain();

        subBass.connect(subBassGain);
        subBassGain.connect(masterGain);

        subBass.type = 'sine';
        subBass.frequency.setValueAtTime(220, now + 0.15); // A3

        subBassGain.gain.setValueAtTime(0, now);
        subBassGain.gain.setValueAtTime(0.15, now + 0.15);
        subBassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        subBass.start(now + 0.15);
        subBass.stop(now + 0.5);

    } catch (e) {
        console.warn('Could not play notification sound:', e);
    }
};

/**
 * Play a success notification sound (ascending chime)
 * Used for successful actions like saving, submitting, etc.
 */
export const playSuccessSound = (): void => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;

        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.setValueAtTime(0.25, now);

        // Ascending three-note chime
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 - major chord
        const delays = [0, 0.08, 0.16];

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(masterGain);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + delays[i]);

            gain.gain.setValueAtTime(0, now);
            gain.gain.setValueAtTime(0.4, now + delays[i]);
            gain.gain.exponentialRampToValueAtTime(0.01, now + delays[i] + 0.3);

            osc.start(now + delays[i]);
            osc.stop(now + delays[i] + 0.3);

            // Add shimmer harmonic
            const harmonic = ctx.createOscillator();
            const harmonicGain = ctx.createGain();

            harmonic.connect(harmonicGain);
            harmonicGain.connect(masterGain);

            harmonic.type = 'sine';
            harmonic.frequency.setValueAtTime(freq * 2, now + delays[i]);

            harmonicGain.gain.setValueAtTime(0, now);
            harmonicGain.gain.setValueAtTime(0.1, now + delays[i]);
            harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + delays[i] + 0.2);

            harmonic.start(now + delays[i]);
            harmonic.stop(now + delays[i] + 0.2);
        });

    } catch (e) {
        console.warn('Could not play success sound:', e);
    }
};

/**
 * Play an error/warning notification sound (descending minor)
 * Used for errors, warnings, or failed actions
 */
export const playErrorSound = (): void => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;

        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.setValueAtTime(0.2, now);

        // Two descending tones (minor feel)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();

        osc1.connect(gain1);
        gain1.connect(masterGain);

        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(392, now); // G4
        osc1.frequency.exponentialRampToValueAtTime(330, now + 0.15); // E4

        gain1.gain.setValueAtTime(0.5, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc1.start(now);
        osc1.stop(now + 0.2);

        // Second lower tone
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();

        osc2.connect(gain2);
        gain2.connect(masterGain);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(330, now + 0.12); // E4
        osc2.frequency.exponentialRampToValueAtTime(262, now + 0.3); // C4

        gain2.gain.setValueAtTime(0, now);
        gain2.gain.setValueAtTime(0.4, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc2.start(now + 0.12);
        osc2.stop(now + 0.35);

    } catch (e) {
        console.warn('Could not play error sound:', e);
    }
};

/**
 * Play a message received notification sound
 * Used when receiving new messages from parents
 */
export const playMessageSound = (): void => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;

        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.setValueAtTime(0.25, now);

        // Soft two-tone "pop-pop"
        const notes = [587.33, 880]; // D5, A5
        const delays = [0, 0.08];

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(masterGain);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + delays[i]);

            gain.gain.setValueAtTime(0, now);
            gain.gain.setValueAtTime(0.35, now + delays[i]);
            gain.gain.exponentialRampToValueAtTime(0.01, now + delays[i] + 0.12);

            osc.start(now + delays[i]);
            osc.stop(now + delays[i] + 0.15);
        });

    } catch (e) {
        console.warn('Could not play message sound:', e);
    }
};

/**
 * Play a reminder notification sound
 * Used for class reminders, task due dates, etc.
 */
export const playReminderSound = (): void => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;

        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.setValueAtTime(0.3, now);

        // Gentle bell-like sound with decay
        const frequencies = [523.25, 659.25, 784]; // C5, E5, G5

        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(masterGain);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.3 - (i * 0.05), now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

            osc.start(now);
            osc.stop(now + 0.8);
        });

        // Add a soft "ping" on top
        const pingOsc = ctx.createOscillator();
        const pingGain = ctx.createGain();

        pingOsc.connect(pingGain);
        pingGain.connect(masterGain);

        pingOsc.type = 'sine';
        pingOsc.frequency.setValueAtTime(1568, now); // G6 - high ping

        pingGain.gain.setValueAtTime(0.15, now);
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        pingOsc.start(now);
        pingOsc.stop(now + 0.3);

    } catch (e) {
        console.warn('Could not play reminder sound:', e);
    }
};

export default {
    playNotificationSound,
    playSuccessSound,
    playErrorSound,
    playMessageSound,
    playReminderSound,
};
