import { Variants } from 'framer-motion';

// Detect low-end device once (synchronous, set by useReducedMotion hook)
const isReduced = () =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion');

// Standard durations in seconds
export const duration = {
  fast: 0.15,
  base: 0.25,
  slow: 0.40,
  chart: 0.70,
  long: 1.00,
  deliberate: 1.20,
} as const;

// Standard easings
export const easing = {
  easeOut: [0.16, 1, 0.3, 1],
  overshoot: [0.34, 1.56, 0.64, 1],
  easeInOutQuad: [0.25, 0.46, 0.45, 0.94],
  spring: { type: 'spring', damping: 25, stiffness: 300 },
} as const;

const zero: Variants = {
  initial: {},
  animate: { opacity: 1 },
  exit: {},
};

// Reusable transition variants — skip animations on low-end devices
export const fadeIn: Variants = isReduced() ? zero : {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: duration.base, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: duration.fast, ease: 'easeIn' } },
};

export const slideUp: Variants = isReduced() ? zero : {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.base, ease: easing.easeOut } },
  exit: { opacity: 0, y: 16, transition: { duration: duration.fast, ease: 'easeIn' } },
};

export const scaleIn: Variants = isReduced() ? zero : {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: duration.base, ease: easing.easeOut } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: duration.fast, ease: 'easeIn' } },
};

export const staggerContainer: Variants = isReduced() ? { animate: {} } : {
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

export default {
  duration,
  easing,
  fadeIn,
  slideUp,
  scaleIn,
  staggerContainer,
};
