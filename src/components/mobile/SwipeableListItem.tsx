/**
 * Swipeable List Item Component
 *
 * A list item wrapper that reveals action buttons on horizontal swipe.
 * Supports left and right swipe actions with haptic feedback,
 * spring-back animations, and accessibility support.
 *
 * Features:
 * - Left and right swipe actions (swipe right reveals left actions, swipe left reveals right actions)
 * - Touch tracking with horizontal vs vertical detection (10px dead zone)
 * - Visual feedback during swipe (background color reveal behind item)
 * - Snap-to-reveal when swipe distance > 50% of threshold
 * - Auto-trigger when swipe distance > 100px threshold
 * - Spring-back animation when released below 50% threshold (300ms ease-out)
 * - Prioritizes vertical scrolling over horizontal swipe gestures
 * - Disables swipe gestures in landscape orientation (via matchMedia)
 * - Haptic feedback on action reveal and trigger using useEnhancedHaptics
 * - aria-label describing available swipe actions for accessibility
 * - Respects prefers-reduced-motion
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useEnhancedHaptics } from '@/hooks/useEnhancedHaptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// ============================================
// TYPES
// ============================================

export interface SwipeAction {
  icon: React.ReactNode;
  label: string;
  color: string; // Tailwind bg class like 'bg-red-500'
  onClick: () => void;
}

export interface SwipeableListItemProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[]; // Revealed on swipe right
  rightActions?: SwipeAction[]; // Revealed on swipe left
  threshold?: number; // Default 100px
  disabled?: boolean;
  disableInLandscape?: boolean; // Default true
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const DEAD_ZONE = 10; // px - minimum movement before direction is determined
const DEFAULT_THRESHOLD = 100; // px - distance for auto-trigger
const SNAP_RATIO = 0.5; // 50% of threshold to snap-to-reveal
const SPRING_BACK_DURATION = 300; // ms
const ACTION_BUTTON_WIDTH = 72; // px per action button

// ============================================
// COMPONENT
// ============================================

export function SwipeableListItem({
  children,
  leftActions = [],
  rightActions = [],
  threshold = DEFAULT_THRESHOLD,
  disabled = false,
  disableInLandscape = true,
  className = '',
}: SwipeableListItemProps) {
  const haptics = useEnhancedHaptics();
  const { shouldReduceMotion } = useReducedMotion();

  // Refs for touch tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isSwipeActive = useRef(false);
  const directionDecided = useRef(false);
  const hasTriggeredRevealHaptic = useRef(false);

  // State
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isRevealed, setIsRevealed] = useState<'left' | 'right' | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);

  // ============================================
  // LANDSCAPE DETECTION
  // ============================================

  // Sync with the matchMedia external system on mount. Disable the
  // set-state-in-effect rule since this synchronizes with a platform API.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!disableInLandscape) return;

    const mediaQuery = window.matchMedia('(orientation: landscape)');
    setIsLandscape(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsLandscape(e.matches);
      // Reset swipe state on orientation change (inlined to avoid
      // referencing resetSwipe before it is declared)
      if (e.matches) {
        setIsAnimating(true);
        setTranslateX(0);
        setIsRevealed(null);
        hasTriggeredRevealHaptic.current = false;
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [disableInLandscape]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ============================================
  // HELPERS
  // ============================================

  const isSwipeDisabled = disabled || (disableInLandscape && isLandscape);
  const hasLeftActions = leftActions.length > 0;
  const hasRightActions = rightActions.length > 0;

  const leftActionsWidth = leftActions.length * ACTION_BUTTON_WIDTH;
  const rightActionsWidth = rightActions.length * ACTION_BUTTON_WIDTH;

  const resetSwipe = useCallback(() => {
    const duration = shouldReduceMotion ? 0 : SPRING_BACK_DURATION;
    setIsAnimating(true);
    setTranslateX(0);
    setIsRevealed(null);
    hasTriggeredRevealHaptic.current = false;

    setTimeout(() => {
      setIsAnimating(false);
    }, duration);
  }, [shouldReduceMotion]);

  const snapToReveal = useCallback((direction: 'left' | 'right') => {
    const targetX = direction === 'right' ? leftActionsWidth : -rightActionsWidth;
    const duration = shouldReduceMotion ? 0 : SPRING_BACK_DURATION;

    setIsAnimating(true);
    setTranslateX(targetX);
    setIsRevealed(direction);
    haptics.select();

    setTimeout(() => {
      setIsAnimating(false);
    }, duration);
  }, [leftActionsWidth, rightActionsWidth, shouldReduceMotion, haptics]);

  const triggerAction = useCallback((actions: SwipeAction[]) => {
    if (actions.length > 0) {
      haptics.success();
      actions[0].onClick();
      resetSwipe();
    }
  }, [haptics, resetSwipe]);

  // ============================================
  // TOUCH HANDLERS
  // ============================================

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isSwipeDisabled) return;

    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    currentX.current = touch.clientX;
    isSwipeActive.current = false;
    directionDecided.current = false;
    hasTriggeredRevealHaptic.current = false;

    // If already revealed, allow interaction
    if (isRevealed) {
      setIsAnimating(false);
    }
  }, [isSwipeDisabled, isRevealed]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isSwipeDisabled) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startX.current;
    const deltaY = touch.clientY - startY.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Direction decision within dead zone
    if (!directionDecided.current) {
      if (absDeltaX < DEAD_ZONE && absDeltaY < DEAD_ZONE) {
        return; // Still in dead zone
      }

      directionDecided.current = true;

      // Prioritize vertical scrolling
      if (absDeltaY > absDeltaX) {
        isSwipeActive.current = false;
        return;
      }

      // Horizontal swipe detected
      isSwipeActive.current = true;
    }

    if (!isSwipeActive.current) return;

    // Prevent vertical scroll while swiping horizontally
    e.preventDefault();

    currentX.current = touch.clientX;

    // Calculate translation with constraints
    let newTranslateX = deltaX;

    // If already revealed, offset from revealed position
    if (isRevealed === 'right') {
      newTranslateX = deltaX + leftActionsWidth;
    } else if (isRevealed === 'left') {
      newTranslateX = deltaX - rightActionsWidth;
    }

    // Constrain: don't allow swipe right if no left actions
    if (newTranslateX > 0 && !hasLeftActions) {
      newTranslateX = 0;
    }
    // Constrain: don't allow swipe left if no right actions
    if (newTranslateX < 0 && !hasRightActions) {
      newTranslateX = 0;
    }

    // Add resistance beyond action width
    if (newTranslateX > leftActionsWidth) {
      const overflow = newTranslateX - leftActionsWidth;
      newTranslateX = leftActionsWidth + overflow * 0.3;
    } else if (newTranslateX < -rightActionsWidth) {
      const overflow = Math.abs(newTranslateX) - rightActionsWidth;
      newTranslateX = -(rightActionsWidth + overflow * 0.3);
    }

    // Haptic feedback when crossing reveal threshold
    if (!hasTriggeredRevealHaptic.current) {
      const snapDistance = threshold * SNAP_RATIO;
      if (Math.abs(newTranslateX) >= snapDistance) {
        haptics.tap();
        hasTriggeredRevealHaptic.current = true;
      }
    }

    setTranslateX(newTranslateX);
  }, [isSwipeDisabled, isRevealed, leftActionsWidth, rightActionsWidth, hasLeftActions, hasRightActions, threshold, haptics]);

  const handleTouchEnd = useCallback(() => {
    if (isSwipeDisabled || !isSwipeActive.current) return;

    const distance = Math.abs(translateX);
    const swipingRight = translateX > 0;
    const swipingLeft = translateX < 0;

    // Auto-trigger: distance exceeds threshold
    if (distance >= threshold) {
      if (swipingRight && hasLeftActions) {
        triggerAction(leftActions);
        return;
      }
      if (swipingLeft && hasRightActions) {
        triggerAction(rightActions);
        return;
      }
    }

    // Snap-to-reveal: distance > 50% of threshold
    const snapDistance = threshold * SNAP_RATIO;
    if (distance >= snapDistance) {
      if (swipingRight && hasLeftActions) {
        snapToReveal('right');
        return;
      }
      if (swipingLeft && hasRightActions) {
        snapToReveal('left');
        return;
      }
    }

    // Spring back: distance < 50% of threshold
    resetSwipe();
  }, [isSwipeDisabled, translateX, threshold, hasLeftActions, hasRightActions, leftActions, rightActions, triggerAction, snapToReveal, resetSwipe]);

  // ============================================
  // ACTION BUTTON CLICK
  // ============================================

  const handleActionClick = useCallback((action: SwipeAction) => {
    haptics.tap();
    action.onClick();
    resetSwipe();
  }, [haptics, resetSwipe]);

  // Close revealed actions on outside click
  useEffect(() => {
    if (!isRevealed) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        resetSwipe();
      }
    };

    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isRevealed, resetSwipe]);

  // ============================================
  // ACCESSIBILITY
  // ============================================

  const ariaLabel = (() => {
    const parts: string[] = [];
    if (hasLeftActions) {
      const labels = leftActions.map(a => a.label).join(', ');
      parts.push(`Geser kanan untuk: ${labels}`);
    }
    if (hasRightActions) {
      const labels = rightActions.map(a => a.label).join(', ');
      parts.push(`Geser kiri untuk: ${labels}`);
    }
    return parts.length > 0 ? parts.join('. ') : undefined;
  })();

  // ============================================
  // ANIMATION STYLES
  // ============================================

  const transitionStyle = isAnimating
    ? `transform ${shouldReduceMotion ? '0ms' : `${SPRING_BACK_DURATION}ms`} cubic-bezier(0.25, 0.46, 0.45, 0.94)`
    : 'none';

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      aria-label={ariaLabel}
      role="listitem"
    >
      {/* Left actions (revealed on swipe right) */}
      {hasLeftActions && (
        <div
          className="absolute inset-y-0 left-0 flex items-stretch"
          aria-hidden={!isRevealed || isRevealed !== 'right'}
        >
          {leftActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className={`flex flex-col items-center justify-center px-4 text-white text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-inset ${action.color}`}
              style={{ width: ACTION_BUTTON_WIDTH }}
              aria-label={action.label}
              tabIndex={isRevealed === 'right' ? 0 : -1}
            >
              <span className="mb-1">{action.icon}</span>
              <span className="truncate max-w-[60px]">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right actions (revealed on swipe left) */}
      {hasRightActions && (
        <div
          className="absolute inset-y-0 right-0 flex items-stretch"
          aria-hidden={!isRevealed || isRevealed !== 'left'}
        >
          {rightActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className={`flex flex-col items-center justify-center px-4 text-white text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-inset ${action.color}`}
              style={{ width: ACTION_BUTTON_WIDTH }}
              aria-label={action.label}
              tabIndex={isRevealed === 'left' ? 0 : -1}
            >
              <span className="mb-1">{action.icon}</span>
              <span className="truncate max-w-[60px]">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Swipeable content */}
      <div
        className="relative z-10 bg-white dark:bg-gray-800"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: transitionStyle,
          // pan-y lets the browser handle vertical scrolling while horizontal
          // swipes are captured in JS (handleTouchMove calls preventDefault).
          touchAction: 'pan-y',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

export default SwipeableListItem;
