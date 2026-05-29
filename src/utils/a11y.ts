/**
 * Accessibility Utilities
 *
 * Provides helper functions for screen reader announcements,
 * focus trapping, and accessibility auditing.
 *
 * Verified: All new components (EnhancedBottomSheet, EnhancedFAB, SwipeableListItem)
 * have proper ARIA attributes including role="dialog", aria-modal, aria-expanded,
 * aria-haspopup, and aria-label for swipe actions.
 */

// Singleton reference to the aria-live announcement region
let announceRegion: HTMLElement | null = null;

/**
 * Announce a message to screen readers using an aria-live region.
 * Creates the region element if it doesn't exist (adds aria-live="polite" to app root).
 *
 * @param message - The message to announce
 * @param priority - 'polite' (default) or 'assertive' for urgent messages
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  if (typeof document === 'undefined') return;

  if (!announceRegion) {
    announceRegion = document.createElement('div');
    announceRegion.setAttribute('role', 'status');
    announceRegion.setAttribute('aria-live', priority);
    announceRegion.setAttribute('aria-atomic', 'true');
    announceRegion.className = 'sr-only';
    announceRegion.style.position = 'absolute';
    announceRegion.style.width = '1px';
    announceRegion.style.height = '1px';
    announceRegion.style.padding = '0';
    announceRegion.style.margin = '-1px';
    announceRegion.style.overflow = 'hidden';
    announceRegion.style.clip = 'rect(0, 0, 0, 0)';
    announceRegion.style.whiteSpace = 'nowrap';
    announceRegion.style.border = '0';
    document.body.appendChild(announceRegion);
  }

  // Update priority if different
  announceRegion.setAttribute('aria-live', priority);

  // Clear and set message (needs to be different to trigger announcement)
  announceRegion.textContent = '';
  setTimeout(() => {
    if (announceRegion) {
      announceRegion.textContent = message;
    }
  }, 100);
}

/**
 * Trap focus within a container element.
 * Returns a cleanup function to restore normal focus behavior.
 *
 * @param container - The DOM element to trap focus within
 * @returns Cleanup function to remove the focus trap
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableSelector =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelector);
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (focusableElements.length === 0) {
      e.preventDefault();
      return;
    }

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Focus the first focusable element
  if (firstFocusable) {
    firstFocusable.focus();
  }

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Check color contrast ratio between two colors.
 * Useful for development-time accessibility auditing.
 * Logs contrast info to console for verification.
 *
 * WCAG Requirements:
 * - AA normal text: 4.5:1
 * - AA large text: 3:1
 * - AAA normal text: 7:1
 *
 * @param foreground - Hex color string (e.g., '#ffffff')
 * @param background - Hex color string (e.g., '#000000')
 * @returns Contrast ratio and WCAG compliance levels
 */
export function checkContrast(foreground: string, background: string): {
  ratio: number;
  aa: boolean;
  aaLarge: boolean;
  aaa: boolean;
} {
  const getLuminance = (hex: string): number => {
    const rgb = hex.replace('#', '').match(/.{2}/g);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map(c => {
      const val = parseInt(c, 16) / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  const result = {
    ratio: Math.round(ratio * 100) / 100,
    aa: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaa: ratio >= 7,
  };

  // Log contrast info for development verification
  if (typeof console !== 'undefined') {
    console.log(
      `[A11y Contrast] ${foreground} on ${background}: ` +
      `ratio=${result.ratio}:1, ` +
      `AA=${result.aa ? '✓' : '✗'}, ` +
      `AA-Large=${result.aaLarge ? '✓' : '✗'}, ` +
      `AAA=${result.aaa ? '✓' : '✗'}`
    );
  }

  return result;
}

export default {
  announceToScreenReader,
  trapFocus,
  checkContrast,
};
