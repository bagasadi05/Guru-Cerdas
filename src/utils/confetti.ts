/**
 * Lazy-loaded Confetti Utilities
 * Only loads canvas-confetti when needed to save bandwidth on low-spec devices
 */

import confetti from 'canvas-confetti';

/**
 * Check if reduced motion is enabled
 */
function shouldSkipConfetti(): boolean {
    if (typeof document === 'undefined') return true;
    return document.documentElement.classList.contains('reduce-motion');
}

/**
 * Trigger a basic confetti burst
 */
export function triggerConfetti() {
    if (shouldSkipConfetti()) return;

    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });
}

/**
 * Trigger a success celebration (side cannons)
 */
export function triggerSuccessConfetti() {
    if (shouldSkipConfetti()) return;

    const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
            ...opts,
            origin: { y: 0.7 },
            particleCount: Math.floor(200 * particleRatio)
        });
    };

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
}

/**
 * Trigger fireworks effect
 */
export function triggerFireworks() {
    if (shouldSkipConfetti()) return;

    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
    }, 250);
}

/**
 * Trigger celebration for 100% attendance
 */
export function triggerPerfectAttendanceConfetti() {
    if (shouldSkipConfetti()) return;

    const colors = ['#22c55e', '#16a34a', '#15803d', '#86efac', '#4ade80'];

    const shoot = () => {
        confetti({
            particleCount: 80,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors
        });
        confetti({
            particleCount: 80,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors
        });
    };

    shoot();
    setTimeout(shoot, 150);
    setTimeout(shoot, 300);
}

/**
 * Trigger star-shaped confetti
 */
export function triggerStarsConfetti() {
    if (shouldSkipConfetti()) return;

    const defaults = {
        spread: 360,
        ticks: 50,
        gravity: 0,
        decay: 0.94,
        startVelocity: 30,
        shapes: ['star'] as confetti.Shape[],
        colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8']
    };

    function shoot() {
        confetti({ ...defaults, particleCount: 40, scalar: 1.2, shapes: ['star'] as confetti.Shape[] });
        confetti({ ...defaults, particleCount: 10, scalar: 0.75, shapes: ['circle'] as confetti.Shape[] });
    }

    setTimeout(shoot, 0);
    setTimeout(shoot, 100);
    setTimeout(shoot, 200);
}

/**
 * Trigger side cannons effect
 */
export function triggerSideCannons() {
    if (shouldSkipConfetti()) return;

    const end = Date.now() + 1500;
    const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef'];

    (function frame() {
        confetti({
            particleCount: 2,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors
        });
        confetti({
            particleCount: 2,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    })();
}

/**
 * Subtle confetti for small achievements
 */
export function triggerSubtleConfetti() {
    if (shouldSkipConfetti()) return;

    confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#6366f1', '#8b5cf6', '#a855f7'],
        scalar: 0.8,
        gravity: 1.2
    });
}
