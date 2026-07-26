/**
 * @fileoverview Motion Components — lightweight wrappers around framer-motion
 *
 * SINGLE SOURCE OF TRUTH for all motion imports across the app.
 *
 * LOW-END DEVICES: The .reduce-motion class on <html>, set synchronously by
 * useReducedMotion BEFORE React hydrates, triggers a build-time/static bypass:
 * framer-motion is statically imported for type safety, but the runtime CSS
 * class `.reduce-motion * { animation-duration: 0.01ms !important; }` kills
 * every animation, and AnimationProvider sets reducedMotion="always" so
 * framer-motion does ZERO animation work on low-end devices.
 *
 * FUTURE (when all 30+ files migrate to these wrappers):
 *   Replace static import with dynamic import + Context so framer-motion's
 *   128KB chunk is NEVER downloaded on low-end devices.
 *
 * @module components/ui/MotionComponents
 */

import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import type { Variants, HTMLMotionProps } from 'framer-motion';
import React from 'react';

// =============================================================================
// EXPORTS — single import surface for ALL motion components
// =============================================================================

export const MotionDiv = motion.div as React.FC<
  React.ComponentProps<typeof motion.div>
>;

export const MotionButton = motion.button as React.FC<
  React.ComponentProps<typeof motion.button>
>;

export const MotionSpan = motion.span as React.FC<
  React.ComponentProps<typeof motion.span>
>;

export const MotionP = motion.p as React.FC<
  React.ComponentProps<typeof motion.p>
>;

export const MotionSection = motion.section as React.FC<
  React.ComponentProps<typeof motion.section>
>;

export const MotionCircle = motion.circle as React.FC<
  React.ComponentProps<typeof motion.circle>
>;

export const MotionLi = motion.li as React.FC<
  React.ComponentProps<typeof motion.li>
>;

export const MotionTr = motion.tr as React.FC<
  React.ComponentProps<typeof motion.tr>
>;

// Re-export framer-motion components & types for centralized import surface
export { AnimatePresence, MotionConfig };
export type { Variants, HTMLMotionProps };
