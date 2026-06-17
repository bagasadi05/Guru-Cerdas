/**
 * Animation Utilities with Framer Motion
 * Provides reusable animation variants and components for the application
 */

import { Variants } from 'framer-motion';
import { duration as motionDuration, easing } from '../styles/motion';

// Page transition animations
export const pageVariants: Variants = {
    initial: {
        opacity: 0,
        y: 20,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: motionDuration.base,
            ease: easing.easeOut,
        },
    },
    exit: {
        opacity: 0,
        y: -20,
        transition: {
            duration: motionDuration.fast,
        },
    },
};

// Fade in animation
export const fadeInVariants: Variants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { duration: motionDuration.base, ease: 'easeOut' },
    },
    exit: {
      opacity: 0,
      transition: { duration: motionDuration.fast, ease: 'easeIn' },
    },
};

// Scale up animation (good for modals, cards)
export const scaleUpVariants: Variants = {
    initial: {
        opacity: 0,
        scale: 0.95,
    },
    animate: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: motionDuration.base,
            ease: easing.easeOut,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        transition: {
            duration: motionDuration.fast,
        },
    },
};

// Slide up animation (good for lists, cards appearing from bottom)
export const slideUpVariants: Variants = {
    initial: {
        opacity: 0,
        y: 24,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: motionDuration.base,
            ease: easing.easeOut,
        },
    },
    exit: {
        opacity: 0,
        y: 24,
        transition: {
            duration: motionDuration.fast,
        },
    },
};

// Staggered children animation (for lists)
export const staggerContainerVariants: Variants = {
    animate: {
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.05,
        },
    },
};

export const staggerItemVariants: Variants = {
    initial: {
        opacity: 0,
        y: 16,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: motionDuration.base,
            ease: easing.easeOut,
        },
    },
};

// Card hover animation
export const cardHoverVariants: Variants = {
    initial: {
        scale: 1,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    hover: {
        scale: 1.02,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        transition: {
            duration: motionDuration.fast,
            ease: 'easeOut',
        },
    },
    tap: {
        scale: 0.98,
    },
};

// Button press animation
export const buttonPressVariants: Variants = {
    initial: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 },
};

// Pulse animation (for notifications, badges)
export const pulseVariants: Variants = {
    animate: {
        scale: [1, 1.05, 1],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
};

// Slide in from left (for sidebar items)
export const slideInLeftVariants: Variants = {
    initial: {
        x: -16,
        opacity: 0,
    },
    animate: {
        x: 0,
        opacity: 1,
        transition: {
            duration: motionDuration.base,
            ease: 'easeOut',
        },
    },
};

// Slide in from right
export const slideInRightVariants: Variants = {
    initial: {
        x: 16,
        opacity: 0,
    },
    animate: {
        x: 0,
        opacity: 1,
        transition: {
            duration: motionDuration.base,
            ease: 'easeOut',
        },
    },
};

// Number counter animation helper
export const getCounterTransition = (durationValue = motionDuration.base) => ({
    duration: durationValue,
    ease: easing.easeOut,
});

// Modal/overlay backdrop
export const backdropVariants: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
};

// Modal content
export const modalVariants: Variants = {
    initial: {
        opacity: 0,
        scale: 0.95,
        y: 16,
    },
    animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            type: easing.spring.type,
            damping: easing.spring.damping,
            stiffness: easing.spring.stiffness,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        y: 16,
        transition: {
            duration: motionDuration.fast,
        },
    },
};

// Toast notification
export const toastVariants: Variants = {
    initial: {
        opacity: 0,
        y: 32,
        scale: 0.95,
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: easing.spring.type,
            damping: easing.spring.damping,
            stiffness: easing.spring.stiffness,
        },
    },
    exit: {
        opacity: 0,
        y: 16,
        scale: 0.95,
        transition: {
            duration: motionDuration.fast,
        },
    },
};

// Floating animation (for decorative elements)
export const floatingVariants: Variants = {
    animate: {
        y: [0, -8, 0],
        transition: {
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
};

// Rotate animation
export const rotateVariants: Variants = {
    animate: {
        rotate: 360,
        transition: {
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
        },
    },
};

// Shimmer/skeleton animation (for loading states)
export const shimmerVariants: Variants = {
    animate: {
        backgroundPosition: ['200% 0', '-200% 0'],
        transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
        },
    },
};

// Success checkmark animation
export const checkmarkVariants: Variants = {
    initial: {
        pathLength: 0,
        opacity: 0,
    },
    animate: {
        pathLength: 1,
        opacity: 1,
        transition: {
            duration: motionDuration.slow,
            ease: 'easeOut',
        },
    },
};

// Stats counter animation (for dashboard numbers)
export const statsCardVariants: Variants = {
    initial: {
        opacity: 0,
        y: 16,
        scale: 0.98,
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: motionDuration.base,
            ease: easing.easeOut,
        },
    },
    hover: {
        y: -4,
        transition: {
            duration: motionDuration.fast,
        },
    },
};
