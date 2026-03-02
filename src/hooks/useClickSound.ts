/**
 * useClickSound
 *
 * Attaches a delegated global click listener that plays a sound and applies
 * a subtle pop animation on interactive elements. Extracted from App.tsx to
 * keep the root component clean.
 */

import { useEffect } from 'react';
import { useSound } from './useSound';

export function useClickSound() {
  const { playClick } = useSound();

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactiveElement = target.closest(
        'button, a, [role="button"], input, select, textarea, .glass-card'
      ) as HTMLElement | null;

      if (!interactiveElement) return;
      if (interactiveElement.dataset.isAnimating === 'true') return;

      playClick();

      if (!interactiveElement.classList.contains('animate-subtle-pop')) {
        interactiveElement.dataset.isAnimating = 'true';
        interactiveElement.classList.add('animate-subtle-pop');

        setTimeout(() => {
          interactiveElement.classList.remove('animate-subtle-pop');
          delete interactiveElement.dataset.isAnimating;
        }, 400);
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [playClick]);
}
