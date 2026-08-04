import React, { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lockScroll, unlockScroll } from '@/utils/mobileUX';
import { useEnhancedHaptics } from '@/hooks/useEnhancedHaptics';

interface EnhancedBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  maxHeight?: string;
  showDragHandle?: boolean;
  closeOnBackdrop?: boolean;
  keyboardAware?: boolean;
}

/**
 * Enhanced Bottom Sheet Component
 *
 * Features:
 * - Slide-up animation with Material Design 3 easing
 * - Drag handle with swipe-down-to-dismiss
 * - Backdrop tap-to-close
 * - Independent content scrolling with overscroll containment
 * - Keyboard awareness via visualViewport
 * - Focus trap and ARIA dialog semantics
 * - Haptic feedback on open/close
 * - Portal rendering
 * - Escape key to close
 * - Safe area bottom padding
 */
const EnhancedBottomSheet: React.FC<EnhancedBottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  maxHeight = '70vh',
  showDragHandle = true,
  closeOnBackdrop = true,
  keyboardAware = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const currentDragY = useRef(0);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const haptics = useEnhancedHaptics();

  // --- Open/Close lifecycle ---
  // Synchronous setState here drives mount/unmount animations, which is an
  // accepted pattern for animated overlays. Disable the set-state-in-effect rule.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setIsVisible(true);
      setIsAnimating(true);
      lockScroll();
      haptics.tap();

      const timer = setTimeout(() => {
        setIsAnimating(false);
        // Focus the sheet for accessibility
        sheetRef.current?.focus();
      }, 350);

      return () => clearTimeout(timer);
    } else if (isVisible) {
      setIsAnimating(true);
      haptics.tap();

      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsAnimating(false);
        setDragOffset(0);
        unlockScroll();

        // Restore focus
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  // --- Keyboard awareness ---
  useEffect(() => {
    if (!keyboardAware || !isOpen) return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleResize = () => {
      const windowHeight = window.innerHeight;
      const viewportHeight = viewport.height;
      const kbHeight = windowHeight - viewportHeight;
      setKeyboardHeight(kbHeight > 50 ? kbHeight : 0);
    };

    viewport.addEventListener('resize', handleResize);
    return () => viewport.removeEventListener('resize', handleResize);
  }, [keyboardAware, isOpen]);

  // --- Escape key handler ---
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // --- Focus trap ---
  useEffect(() => {
    if (!isOpen || !sheetRef.current) return;

    const sheet = sheetRef.current;

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = sheet.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleFocusTrap);
    return () => document.removeEventListener('keydown', handleFocusTrap);
  }, [isOpen]);

  // --- Drag gesture handlers ---
  const handleDragStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      // Don't start drag if content is scrolled
      if (contentRef.current && contentRef.current.scrollTop > 0) return;

      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      dragStartY.current = clientY;
      currentDragY.current = clientY;
      setIsDragging(true);
    },
    []
  );

  const handleDragMove = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!isDragging) return;

      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      currentDragY.current = clientY;
      const delta = clientY - dragStartY.current;

      // Only allow dragging downward
      if (delta > 0) {
        setDragOffset(delta);
      }
    },
    [isDragging]
  );

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const sheetHeight = sheetRef.current?.offsetHeight || 0;
    const threshold = Math.min(100, sheetHeight * 0.3);

    if (dragOffset > threshold) {
      // Dismiss
      onClose();
    } else {
      // Snap back
      setDragOffset(0);
    }
  }, [isDragging, dragOffset, onClose]);

  // --- Backdrop click ---
  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdrop) {
      onClose();
    }
  }, [closeOnBackdrop, onClose]);

  // Don't render if not visible
  if (!isVisible && !isOpen) return null;

  const sheetTransform = isDragging
    ? `translateY(${dragOffset}px)`
    : isOpen && !isAnimating
      ? 'translateY(0)'
      : !isOpen && isAnimating
        ? 'translateY(100%)'
        : undefined;

  const sheetStyle: React.CSSProperties = {
    maxHeight: keyboardHeight > 0 ? `calc(${maxHeight} - ${keyboardHeight}px)` : maxHeight,
    paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
    transform: sheetTransform,
    transition: isDragging ? 'none' : undefined,
  };

  return createPortal(
    <div
      className="fixed inset-0 z-overlay"
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen && !isAnimating ? 'opacity-100' : isOpen && isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleBackdropClick}
        aria-hidden="true"
        style={{
          animation: isOpen && isAnimating ? 'ebs-fade-in 0.3s ease-out forwards' : undefined,
        }}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 z-modal
                   bg-white dark:bg-slate-900
                   rounded-t-3xl shadow-2xl
                   border-t border-slate-200 dark:border-slate-700
                   flex flex-col
                   outline-none"
        style={{
          ...sheetStyle,
          animation:
            isOpen && isAnimating
              ? 'ebs-slide-up 0.35s cubic-bezier(0.32, 0.72, 0, 1) forwards'
              : undefined,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Bottom sheet'}
        tabIndex={-1}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={() => {
          if (isDragging) handleDragEnd();
        }}
      >
        {/* Drag Handle */}
        {showDragHandle && (
          <div
            className="w-full flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
            aria-hidden="true"
          >
            <div
              className="bg-slate-300 dark:bg-slate-600 rounded-full"
              style={{ width: '32px', height: '4px' }}
            />
          </div>
        )}

        {/* Header */}
        {(title || subtitle) && (
          <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            {title && (
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Scrollable Content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto px-6 py-4"
          style={{ overscrollBehavior: 'contain' }}
        >
          {children}
        </div>
      </div>

      {/* Keyframe Animations */}
      <style>{`
        @keyframes ebs-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes ebs-slide-up {
          from {
            transform: translateY(100%);
            opacity: 0.5;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default EnhancedBottomSheet;
export type { EnhancedBottomSheetProps };
