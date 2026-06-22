/**
 * Enhanced Keyboard Awareness Hook
 *
 * Provides comprehensive keyboard detection and UI adjustment for mobile devices.
 * Handles hiding bottom nav, hiding FAB, auto-scrolling to focused inputs,
 * and form validation scroll-to-error.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { isNavigationInProgress } from '../utils/navigationState';

interface KeyboardState {
  isVisible: boolean;
  height: number;
  animating: boolean;
}

interface UseKeyboardAwarenessOptions {
  hideBottomNav?: boolean; // Default true - adds 'keyboard-visible' class to body
  hideFAB?: boolean; // Default true - adds 'keyboard-hide-fab' class to body
  scrollToFocused?: boolean; // Default true
  scrollOffset?: number; // Extra padding above focused element (default 20px)
}

export function useKeyboardAwareness(options: UseKeyboardAwarenessOptions = {}): KeyboardState & {
  scrollToFirstError: (containerSelector?: string) => void;
} {
  const {
    hideBottomNav = true,
    hideFAB = true,
    scrollToFocused = true,
    scrollOffset = 20,
  } = options;

  const [state, setState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
    animating: false,
  });

  const previousHeight = useRef(0);
  const isKeyboardVisibleRef = useRef(false);
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVisibleRef = useRef(false);

  // Monitor focus/blur globally to detect unmounted or blurred inputs
  useEffect(() => {
    const handleFocusChange = () => {
      // Delay slightly to allow activeElement to resolve correctly
      setTimeout(() => {
        const activeEl = document.activeElement;
        const isInputFocused = activeEl && (
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) ||
          (activeEl as HTMLElement).contentEditable === 'true'
        );

        if (!isInputFocused && isKeyboardVisibleRef.current) {
          isKeyboardVisibleRef.current = false;
          setState({
            isVisible: false,
            height: 0,
            animating: false,
          });
        }
      }, 50);
    };

    document.addEventListener('focus', handleFocusChange, true);
    document.addEventListener('blur', handleFocusChange, true);

    return () => {
      document.removeEventListener('focus', handleFocusChange, true);
      document.removeEventListener('blur', handleFocusChange, true);
    };
  }, []);

  // Keep ref in sync with state
  useEffect(() => {
    isVisibleRef.current = state.isVisible;
  }, [state.isVisible]);

  // Apply/remove body classes for bottom nav and FAB visibility
  useEffect(() => {
    if (navRetryTimer.current) {
      clearTimeout(navRetryTimer.current);
      navRetryTimer.current = null;
    }

    if (state.isVisible) {
      const skipNavCheck = isNavigationInProgress();
      if (hideBottomNav && !skipNavCheck) {
        document.body.classList.add('keyboard-visible');
      }
      if (hideFAB) {
        document.body.classList.add('keyboard-hide-fab');
      }
      // Retry after navigation cooldown if was blocked by navigation
      if (skipNavCheck) {
        navRetryTimer.current = setTimeout(() => {
          if (isVisibleRef.current) {
            document.body.classList.add('keyboard-visible');
          }
        }, 350);
      }
    } else {
      document.body.classList.remove('keyboard-visible');
      document.body.classList.remove('keyboard-hide-fab');
    }

    return () => {
      if (navRetryTimer.current) {
        clearTimeout(navRetryTimer.current);
        navRetryTimer.current = null;
      }
      document.body.classList.remove('keyboard-visible');
      document.body.classList.remove('keyboard-hide-fab');
    };
  }, [state.isVisible, hideBottomNav, hideFAB]);

  // Primary: visualViewport resize detection
  useEffect(() => {
    const viewport = window.visualViewport;

    if (viewport) {
      const handleResize = () => {
        const windowHeight = window.innerHeight;
        const viewportHeight = viewport.height;
        const keyboardHeight = windowHeight - viewportHeight;
        
        // Only count keyboard as visible if an input element is currently focused
        const activeEl = document.activeElement;
        const isInputFocused = activeEl && (
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) ||
          (activeEl as HTMLElement).contentEditable === 'true'
        );
        const isKeyboardVisible = keyboardHeight > 100 && !!isInputFocused;

        // Detect animation state using ref to avoid stale closures
        if (isKeyboardVisible !== isKeyboardVisibleRef.current) {
          isKeyboardVisibleRef.current = isKeyboardVisible;
          setState((prev) => ({ ...prev, animating: true }));
          if (animationTimer.current) clearTimeout(animationTimer.current);
          animationTimer.current = setTimeout(() => {
            setState((prev) => ({ ...prev, animating: false }));
          }, 300);
        }

        setState({
          isVisible: isKeyboardVisible,
          height: isKeyboardVisible ? keyboardHeight : 0,
          animating: false,
        });

        previousHeight.current = keyboardHeight;
      };

      viewport.addEventListener('resize', handleResize);
      viewport.addEventListener('scroll', handleResize);
      return () => {
        viewport.removeEventListener('resize', handleResize);
        viewport.removeEventListener('scroll', handleResize);
        if (animationTimer.current) clearTimeout(animationTimer.current);
      };
    } else {
      // Fallback: focusin/focusout for older browsers
      const handleFocusIn = (e: FocusEvent) => {
        const target = e.target as HTMLElement;
        const isInputLike = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
        const isContentEditable = target.contentEditable === 'true';

        if (isInputLike || isContentEditable) {
          const estimatedHeight = window.innerHeight * 0.4;
          isKeyboardVisibleRef.current = true;
          setState({
            isVisible: true,
            height: estimatedHeight,
            animating: false,
          });

          // Auto-scroll to focused element
          if (scrollToFocused) {
            setTimeout(() => {
              target.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
            }, 300);
          }
        }
      };

      const handleFocusOut = () => {
        isKeyboardVisibleRef.current = false;
        setState({
          isVisible: false,
          height: 0,
          animating: false,
        });
      };

      document.addEventListener('focusin', handleFocusIn);
      document.addEventListener('focusout', handleFocusOut);

      return () => {
        document.removeEventListener('focusin', handleFocusIn);
        document.removeEventListener('focusout', handleFocusOut);
        if (animationTimer.current) clearTimeout(animationTimer.current);
      };
    }
  }, [scrollToFocused, scrollOffset]);  

  // Auto-scroll to focused input when keyboard appears (visualViewport path)
  useEffect(() => {
    if (!scrollToFocused || !state.isVisible) return;

    const activeElement = document.activeElement as HTMLElement;
    if (!activeElement) return;

    const isInputLike = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName);
    const isContentEditable = activeElement.contentEditable === 'true';

    if (isInputLike || isContentEditable) {
      setTimeout(() => {
        const rect = activeElement.getBoundingClientRect();
        const viewportHeight =
          window.visualViewport?.height || window.innerHeight - state.height;

        // Check if element is below the visible area
        if (rect.bottom > viewportHeight - scrollOffset) {
          activeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 100);
    }
  }, [state.isVisible, state.height, scrollToFocused, scrollOffset]);

  // Scroll to first error in a form
  const scrollToFirstError = useCallback((containerSelector?: string) => {
    const container = containerSelector
      ? document.querySelector(containerSelector)
      : document;

    if (!container) return;

    // Look for common error indicators
    const errorElement = container.querySelector(
      '[aria-invalid="true"], .error, .is-invalid, [data-error="true"], .border-red-500, .border-rose-500'
    ) as HTMLElement;

    if (errorElement) {
      errorElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      // Focus the error element if it's an input
      const input =
        errorElement.tagName === 'INPUT' || errorElement.tagName === 'TEXTAREA'
          ? errorElement
          : (errorElement.querySelector('input, textarea, select') as HTMLElement);

      if (input) {
        setTimeout(() => input.focus(), 300);
      }
    }
  }, []);

  return {
    ...state,
    scrollToFirstError,
  };
}

export default useKeyboardAwareness;
