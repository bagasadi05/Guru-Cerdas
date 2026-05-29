/**
 * Enhanced Floating Action Button (FAB)
 *
 * Material Design 3 compliant FAB with expandable menu, haptic feedback,
 * keyboard awareness, landscape offset, and accessibility support.
 *
 * Features:
 * - MD3 sizing: 56px primary, 40px secondary, 48px tertiary
 * - Expandable menu with up to 4 action items (48x48px touch targets)
 * - Staggered scale-in animation (50ms delay per item)
 * - Scale-down animation on close (200ms)
 * - Haptic feedback via useEnhancedHaptics
 * - Position above bottom nav in portrait
 * - Offset from side rail in landscape
 * - Hidden when keyboard is visible
 * - Full accessibility: aria-expanded, aria-haspopup
 * - Respects prefers-reduced-motion
 * - Backdrop overlay when expanded
 * - Close on outside click/tap
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useKeyboardAwareness } from '@/utils/mobileUX';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useEnhancedHaptics } from '@/hooks/useEnhancedHaptics';

// ============================================
// TYPES
// ============================================

export interface FABAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

export interface EnhancedFABProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  actions?: FABAction[]; // Up to 4 items
  variant?: 'primary' | 'secondary' | 'tertiary';
  position?: 'bottom-right' | 'bottom-left';
  hideOnKeyboard?: boolean; // Default true
}

// ============================================
// CONSTANTS
// ============================================

const VARIANT_SIZES: Record<string, number> = {
  primary: 56,
  secondary: 40,
  tertiary: 48,
};

const ACTION_ITEM_SIZE = 48;
const STAGGER_DELAY_MS = 50;
const CLOSE_ANIMATION_MS = 200;
const MAX_ACTIONS = 4;

// ============================================
// ORIENTATION HOOK
// ============================================

function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(() => {
    if (typeof window === 'undefined') return 'portrait';
    return window.matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait';
  });

  useEffect(() => {
    const mql = window.matchMedia('(orientation: landscape)');
    const handler = (e: MediaQueryListEvent) => {
      setOrientation(e.matches ? 'landscape' : 'portrait');
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return orientation;
}

// ============================================
// COMPONENT
// ============================================

export const EnhancedFAB: React.FC<EnhancedFABProps> = ({
  icon,
  label,
  onClick,
  actions = [],
  variant = 'primary',
  position = 'bottom-right',
  hideOnKeyboard = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { isKeyboardVisible } = useKeyboardAwareness();
  const { shouldReduceMotion } = useReducedMotion();
  const haptics = useEnhancedHaptics();
  const orientation = useOrientation();

  // Limit actions to 4
  const limitedActions = actions.slice(0, MAX_ACTIONS);
  const hasActions = limitedActions.length > 0;

  // ============================================
  // HANDLERS
  // ============================================

  const handleClose = useCallback(() => {
    if (shouldReduceMotion) {
      setIsExpanded(false);
      setIsClosing(false);
      return;
    }

    setIsClosing(true);
    setTimeout(() => {
      setIsExpanded(false);
      setIsClosing(false);
    }, CLOSE_ANIMATION_MS);
  }, [shouldReduceMotion]);

  const handleFABClick = useCallback(() => {
    // Haptic feedback (20ms vibration = tap pattern)
    haptics.tap();

    if (isExpanded) {
      handleClose();
      return;
    }

    if (hasActions) {
      setIsExpanded(true);
    } else if (onClick) {
      onClick();
    }
  }, [isExpanded, hasActions, onClick, haptics, handleClose]);

  const handleActionClick = useCallback(
    (action: FABAction) => {
      haptics.select();
      action.onClick();
      handleClose();
    },
    [haptics, handleClose]
  );

  const handleBackdropClick = useCallback(() => {
    handleClose();
  }, [handleClose]);

  // Close on outside click
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isExpanded, handleClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isExpanded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, handleClose]);

  // ============================================
  // VISIBILITY
  // ============================================

  // Hide when keyboard is visible
  if (hideOnKeyboard && isKeyboardVisible) {
    return null;
  }

  // ============================================
  // STYLES
  // ============================================

  const fabSize = VARIANT_SIZES[variant];

  // Position styles
  const getPositionStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 50,
    };

    if (orientation === 'landscape') {
      // Offset from side rail in landscape
      style.right = 'calc(80px + 16px)';
      style.bottom = '16px';
    } else {
      // Above bottom nav in portrait
      style.bottom = 'calc(80px + env(safe-area-inset-bottom))';
      if (position === 'bottom-right') {
        style.right = '16px';
      } else {
        style.left = '16px';
      }
    }

    // Override horizontal position for landscape
    if (orientation === 'portrait') {
      if (position === 'bottom-right') {
        style.right = '16px';
      } else {
        style.left = '16px';
      }
    }

    return style;
  };

  // FAB button styles
  const getFABStyle = (): React.CSSProperties => ({
    width: `${fabSize}px`,
    height: `${fabSize}px`,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: shouldReduceMotion ? 'none' : 'transform 200ms ease, box-shadow 200ms ease',
    transform: isExpanded ? 'rotate(45deg)' : 'rotate(0deg)',
    touchAction: 'manipulation',
  });

  // Action item styles
  const getActionItemStyle = (index: number): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: `${ACTION_ITEM_SIZE}px`,
      height: `${ACTION_ITEM_SIZE}px`,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
      touchAction: 'manipulation',
    };

    if (shouldReduceMotion) {
      // No animation - just show/hide
      baseStyle.opacity = isExpanded && !isClosing ? 1 : 0;
      baseStyle.transform = 'scale(1)';
      return baseStyle;
    }

    if (isClosing) {
      // Scale-down animation on close (200ms, all at once)
      baseStyle.transition = `transform ${CLOSE_ANIMATION_MS}ms ease-in, opacity ${CLOSE_ANIMATION_MS}ms ease-in`;
      baseStyle.transform = 'scale(0)';
      baseStyle.opacity = 0;
    } else if (isExpanded) {
      // Staggered scale-in animation
      const delay = index * STAGGER_DELAY_MS;
      baseStyle.transition = `transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms, opacity 200ms ease ${delay}ms`;
      baseStyle.transform = 'scale(1)';
      baseStyle.opacity = 1;
    } else {
      baseStyle.transform = 'scale(0)';
      baseStyle.opacity = 0;
    }

    return baseStyle;
  };

  // Action label styles
  const getActionLabelStyle = (index: number): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      fontSize: '13px',
      fontWeight: 500,
      whiteSpace: 'nowrap',
      padding: '4px 10px',
      borderRadius: '6px',
      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
      pointerEvents: 'none',
    };

    if (shouldReduceMotion) {
      baseStyle.opacity = isExpanded && !isClosing ? 1 : 0;
      return baseStyle;
    }

    if (isClosing) {
      baseStyle.transition = `opacity ${CLOSE_ANIMATION_MS}ms ease-in`;
      baseStyle.opacity = 0;
    } else if (isExpanded) {
      const delay = index * STAGGER_DELAY_MS;
      baseStyle.transition = `opacity 200ms ease ${delay}ms`;
      baseStyle.opacity = 1;
    } else {
      baseStyle.opacity = 0;
    }

    return baseStyle;
  };

  // Backdrop styles
  const getBackdropStyle = (): React.CSSProperties => ({
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    zIndex: 49,
    opacity: isExpanded && !isClosing ? 1 : 0,
    transition: shouldReduceMotion ? 'none' : `opacity ${CLOSE_ANIMATION_MS}ms ease`,
  });

  // ============================================
  // RENDER
  // ============================================

  return (
    <>
      {/* Backdrop overlay when menu is expanded */}
      {(isExpanded || isClosing) && (
        <div
          style={getBackdropStyle()}
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* FAB Container */}
      <div ref={containerRef} style={getPositionStyle()}>
        {/* Action Items Menu */}
        {(isExpanded || isClosing) && hasActions && (
          <div
            role="menu"
            aria-label={`${label} menu`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: position === 'bottom-right' ? 'flex-end' : 'flex-start',
              gap: '12px',
              marginBottom: '12px',
            }}
          >
            {limitedActions.map((action, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexDirection: position === 'bottom-right' ? 'row' : 'row-reverse',
                }}
              >
                {/* Action Label */}
                <span
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  style={getActionLabelStyle(index)}
                >
                  {action.label}
                </span>

                {/* Action Button */}
                <button
                  role="menuitem"
                  aria-label={action.label}
                  onClick={() => handleActionClick(action)}
                  className={`${
                    action.color ||
                    'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  style={getActionItemStyle(index)}
                >
                  {action.icon}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main FAB Button */}
        <button
          onClick={handleFABClick}
          aria-label={label}
          aria-expanded={hasActions ? isExpanded : undefined}
          aria-haspopup={hasActions ? 'menu' : undefined}
          className="bg-sky-600 hover:bg-sky-700 active:bg-sky-800 dark:bg-purple-600 dark:hover:bg-purple-700 dark:active:bg-purple-800 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-purple-500"
          style={getFABStyle()}
        >
          {icon}
        </button>
      </div>
    </>
  );
};

export default EnhancedFAB;
