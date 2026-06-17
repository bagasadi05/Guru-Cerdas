import { Variants } from 'framer-motion';

// Standard durations in seconds
export const duration = {
  fast: 0.15, // 150ms
  base: 0.25, // 250ms
  slow: 0.40, // 400ms
  chart: 0.70, // 700ms
  long: 1.00, // 1000ms
  deliberate: 1.20, // 1200ms
} as const;

// Standard easings
export const easing = {
  easeOut: [0.16, 1, 0.3, 1], // easeOutExpo
  overshoot: [0.34, 1.56, 0.64, 1], // spring-like overshoot
  easeInOutQuad: [0.25, 0.46, 0.45, 0.94],
  spring: {
    type: 'spring',
    damping: 25,
    stiffness: 300,
  },
} as const;

// Reusable transition variants
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: duration.base, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: duration.fast, ease: 'easeIn' },
  },
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: easing.easeOut },
  },
  exit: {
    opacity: 0,
    y: 16,
    transition: { duration: duration.fast, ease: 'easeIn' },
  },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.base, ease: easing.easeOut },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: duration.fast, ease: 'easeIn' },
  },
};

export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

export default {
  duration,
  easing,
  fadeIn,
  slideUp,
  scaleIn,
  staggerContainer,
};
