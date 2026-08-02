/**
 * @fileoverview Motion Components — lightweight wrappers around framer-motion
 *
 * SINGLE SOURCE OF TRUTH for all motion imports across the app.
 *
 * LOW-END DEVICES: framer-motion is loaded via a DYNAMIC import() gated by
 * MotionProvider, which only fires on devices that can actually use it.
 * On low-end devices (auto-detected by useReducedMotion) or when the user
 * prefers reduced motion, the import NEVER fires — the vendor-framer chunk
 * is never downloaded. Every Motion* wrapper falls back to a plain DOM
 * element (passthrough) with motion-only props stripped, so the layout is
 * identical and only the animation is skipped (which is exactly what
 * reduced-motion users expect anyway).
 *
 * HIGH-END DEVICES: MotionProvider kicks off the dynamic import on mount;
 * while the module loads, the same passthrough elements render, then swap
 * to the real motion components. Tradeoff: on the FIRST visit (before the
 * service worker runtime-caches the chunk) the page may briefly render at
 * its final state, then remount from `initial` and animate in — a one-time
 * flash. After the first visit the chunk is served from the SW runtime
 * cache, so the swap is imperceptible.
 *
 * @module components/ui/MotionComponents
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
// Type-only imports — erased at build time, zero runtime cost. The actual
// module is fetched by MotionProvider on demand.
import type {
  Variants,
  HTMLMotionProps,
  SVGMotionProps,
  AnimatePresenceProps,
  MotionConfigProps,
} from 'framer-motion';
import { useReducedMotion, useIsLowPerformanceDevice } from '../../hooks/useReducedMotion';

type FramerMotionModule = typeof import('framer-motion');

const MotionContext = createContext<FramerMotionModule | null>(null);

/**
 * Loads framer-motion on demand. On low-end or reduced-motion devices the
 * dynamic import NEVER fires, so the vendor-framer chunk is never downloaded.
 * Mount this above anything that uses the Motion* wrappers (e.g. in
 * AppProviders, wrapping AnimationProvider).
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const { shouldReduceMotion } = useReducedMotion();
  const isLowPerfDevice = useIsLowPerformanceDevice();
  const [motionModule, setMotionModule] = useState<FramerMotionModule | null>(null);

  useEffect(() => {
    // Low-end or reduced-motion devices: framer-motion does zero animation
    // work for them anyway, so downloading the chunk would be pure waste.
    if (shouldReduceMotion || isLowPerfDevice) return;

    let cancelled = false;
    import('framer-motion')
      .then((mod) => {
        if (!cancelled) setMotionModule(mod);
      })
      .catch(() => {
        // Import failed (offline / blocked): stay in passthrough mode.
      });
    return () => {
      cancelled = true;
    };
  }, [shouldReduceMotion, isLowPerfDevice]);

  return <MotionContext.Provider value={motionModule}>{children}</MotionContext.Provider>;
}

/**
 * Motion-only props that must be stripped when falling back to a plain DOM
 * element, so they never leak into the DOM as invalid attributes. Kept in
 * sync with framer-motion's MotionProps keys.
 */
const MOTION_ONLY_PROPS = new Set<string>([
  'initial',
  'animate',
  'exit',
  'transition',
  'variants',
  'custom',
  'whileHover',
  'whileTap',
  'whileFocus',
  'whileInView',
  'whileDrag',
  'drag',
  'dragDirectionLock',
  'dragControls',
  'dragElastic',
  'dragListener',
  'dragMomentum',
  'dragPropagation',
  'dragSnapToOrigin',
  'layout',
  'layoutId',
  'layoutDependency',
  'layoutScroll',
  'viewport',
  'onViewportEnter',
  'onViewportLeave',
  'onAnimationStart',
  'onAnimationComplete',
  'onAnimationRepeat',
  'onUpdate',
  'onDragStart',
  'onDragEnd',
  'onDragTransitionEnd',
  'transformTemplate',
  'transformValues',
  'inherit',
]);

/**
 * Creates a Motion* wrapper for a DOM tag. When framer-motion is loaded it
 * renders the real motion component with all props; otherwise it renders a
 * plain element with motion-only props stripped (passthrough fallback).
 */
function createMotionComponent(tag: string) {
  const Component: React.FC<Record<string, unknown>> = (props) => {
    const motionModule = useContext(MotionContext);

    if (motionModule) {
      const MotionTag = (motionModule.motion as unknown as Record<string, React.ElementType>)[tag];
      return <MotionTag {...props} />;
    }

    // Passthrough fallback: plain element, motion-only props stripped.
    const domProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (!MOTION_ONLY_PROPS.has(key)) domProps[key] = value;
    }
    return React.createElement(tag, domProps as React.HTMLAttributes<HTMLElement>);
  };
  return Component;
}

// =============================================================================
// EXPORTS — single import surface for ALL motion components
// =============================================================================

export const MotionDiv = createMotionComponent('div') as unknown as React.FC<HTMLMotionProps<'div'>>;
export const MotionButton = createMotionComponent('button') as unknown as React.FC<HTMLMotionProps<'button'>>;
export const MotionSpan = createMotionComponent('span') as unknown as React.FC<HTMLMotionProps<'span'>>;
export const MotionP = createMotionComponent('p') as unknown as React.FC<HTMLMotionProps<'p'>>;
export const MotionSection = createMotionComponent('section') as unknown as React.FC<HTMLMotionProps<'section'>>;
export const MotionCircle = createMotionComponent('circle') as unknown as React.FC<SVGMotionProps<'circle'>>;
export const MotionLi = createMotionComponent('li') as unknown as React.FC<HTMLMotionProps<'li'>>;
export const MotionTr = createMotionComponent('tr') as unknown as React.FC<HTMLMotionProps<'tr'>>;

/**
 * AnimatePresence wrapper — real framer AnimatePresence when loaded,
 * otherwise a passthrough that renders children directly (no exit animation).
 */
export function AnimatePresence({
  children,
  ...rest
}: React.PropsWithChildren<AnimatePresenceProps>) {
  const motionModule = useContext(MotionContext);
  if (!motionModule) return <>{children}</>;
  const AP = motionModule.AnimatePresence;
  return <AP {...rest}>{children}</AP>;
}

/**
 * MotionConfig wrapper — real framer MotionConfig when loaded, otherwise a
 * passthrough that renders children directly (config is a no-op without the
 * library).
 */
export function MotionConfig({ children, ...rest }: React.PropsWithChildren<MotionConfigProps>) {
  const motionModule = useContext(MotionContext);
  if (!motionModule) return <>{children}</>;
  const MC = motionModule.MotionConfig;
  return <MC {...rest}>{children}</MC>;
}

// Re-export framer-motion types for the centralized import surface
export type { Variants, HTMLMotionProps };
