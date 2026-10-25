import { useState, useEffect, useRef, useCallback } from 'react';
import type React from 'react';
import type { GuidedStep } from './types';

interface UseTutorialSpotlightParams {
  step: GuidedStep;
  onNext: () => void;
}

export const useTutorialSpotlight = ({ step, onNext }: UseTutorialSpotlightParams) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [targetFound, setTargetFound] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const clickListenerRef = useRef<(() => void) | null>(null);
  const hasScrolledRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Find target element
  const findTarget = useCallback(() => {
    if (!step.target) {
      setTargetRect(null);
      setTargetFound(false);
      return false;
    }

    const selectors = step.target.split(',').map((s) => s.trim());
    let element: Element | null = null;

    for (const selector of selectors) {
      try {
        element = document.querySelector(selector);
        if (element) break;
      } catch {
        /* skip invalid */
      }
    }

    if (element) {
      const rect = element.getBoundingClientRect();
      // Only update if element is visible
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect);
        setTargetFound(true);

        // Scroll into view only ONCE per step, and never for fixed/sticky
        // elements (their position is relative to the viewport, so trying to
        // center them causes the page to scroll endlessly).
        if (!hasScrolledRef.current) {
          const pos = window.getComputedStyle(element).position;
          const isPinned = pos === 'fixed' || pos === 'sticky';
          const offscreen = rect.top < 80 || rect.bottom > window.innerHeight - 20;
          if (!isPinned && offscreen) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          hasScrolledRef.current = true;
        }

        // Attach click listener for advanceOnTargetClick
        if (step.advanceOnTargetClick && !clickListenerRef.current) {
          const handler = () => {
            setTimeout(onNext, 200);
          };
          element.addEventListener('click', handler, { once: true });
          clickListenerRef.current = () => element?.removeEventListener('click', handler);
        }
        return true;
      }
    }

    setTargetFound(false);
    setTargetRect(null);
    return false;
  }, [step.target, step.advanceOnTargetClick, onNext]);

  // Setup: find target, observe DOM, handle resize
  useEffect(() => {
    clickListenerRef.current = null;
    hasScrolledRef.current = false;

    const countTimer = setTimeout(() => {
      setCountdown(null);
    }, 0);

    // Throttled re-scan using requestAnimationFrame to avoid layout thrash
    const scheduleFind = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        findTarget();
      });
    };

    // Delay to let page render after navigation
    const initTimer = setTimeout(findTarget, 600);

    // Observe DOM for lazy-loaded content
    observerRef.current = new MutationObserver(scheduleFind);
    observerRef.current.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('resize', scheduleFind);
    window.addEventListener('scroll', scheduleFind, true);

    return () => {
      clearTimeout(countTimer);
      clearTimeout(initTimer);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      observerRef.current?.disconnect();
      window.removeEventListener('resize', scheduleFind);
      window.removeEventListener('scroll', scheduleFind, true);
      if (clickListenerRef.current) clickListenerRef.current();
    };
  }, [step.id, findTarget]);

  // Auto-advance with countdown
  useEffect(() => {
    if (!step.autoAdvanceMs) return;

    const totalSeconds = Math.ceil(step.autoAdvanceMs / 1000);

    const cTimer = setTimeout(() => {
      setCountdown(totalSeconds);
    }, 0);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) return null;
        return prev - 1;
      });
    }, 1000);

    autoAdvanceRef.current = setTimeout(onNext, step.autoAdvanceMs);

    return () => {
      clearTimeout(cTimer);
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [step.id, step.autoAdvanceMs, onNext]);

  // Tooltip positioning
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const tw = 350;
    const th = 220;
    const gap = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = 0;
    let left = 0;

    const pos = step.position || 'bottom';
    switch (pos) {
      case 'bottom':
        top = targetRect.bottom + gap;
        left = targetRect.left + targetRect.width / 2 - tw / 2;
        break;
      case 'top':
        top = targetRect.top - th - gap;
        left = targetRect.left + targetRect.width / 2 - tw / 2;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - th / 2;
        left = targetRect.right + gap;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - th / 2;
        left = targetRect.left - tw - gap;
        break;
      default:
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    // Fallback if off-screen
    if (left + tw > vw - 12) left = vw - tw - 12;
    if (left < 12) left = 12;
    if (top + th > vh - 12) top = targetRect.top - th - gap;
    if (top < 12) top = 12;

    return { top, left };
  };

  return {
    targetRect,
    targetFound,
    countdown,
    getTooltipStyle,
  };
};
