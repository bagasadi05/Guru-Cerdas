import { useCallback, useEffect, useRef, useState } from 'react';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ];

    return Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelectors.join(','))
    ).filter(element => element.offsetParent !== null);
}

export function useFocusTrap(enabled: boolean = true) {
    const containerRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!enabled || !containerRef.current) {
            return undefined;
        }

        previousFocusRef.current = document.activeElement as HTMLElement;

        const focusableElements = getFocusableElements(containerRef.current);
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab' || !containerRef.current) {
                return;
            }

            const currentFocusableElements = getFocusableElements(containerRef.current);
            const firstElement = currentFocusableElements[0];
            const lastElement = currentFocusableElements[currentFocusableElements.length - 1];

            if (event.shiftKey) {
                if (document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement?.focus();
                }
            } else if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            previousFocusRef.current?.focus();
        };
    }, [enabled]);

    return containerRef;
}

interface KeyboardNavigationOptions {
    onEnter?: () => void;
    onEscape?: () => void;
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
    onHome?: () => void;
    onEnd?: () => void;
    onTab?: (shiftKey: boolean) => void;
    preventDefault?: boolean;
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions) {
    const handleKeyDown = useCallback((event: KeyboardEvent | React.KeyboardEvent) => {
        const { key, shiftKey } = event;

        switch (key) {
            case 'Enter':
                if (options.onEnter) {
                    if (options.preventDefault) event.preventDefault();
                    options.onEnter();
                }
                break;
            case 'Escape':
                if (options.onEscape) {
                    if (options.preventDefault) event.preventDefault();
                    options.onEscape();
                }
                break;
            case 'ArrowUp':
                if (options.onArrowUp) {
                    if (options.preventDefault) event.preventDefault();
                    options.onArrowUp();
                }
                break;
            case 'ArrowDown':
                if (options.onArrowDown) {
                    if (options.preventDefault) event.preventDefault();
                    options.onArrowDown();
                }
                break;
            case 'ArrowLeft':
                if (options.onArrowLeft) {
                    if (options.preventDefault) event.preventDefault();
                    options.onArrowLeft();
                }
                break;
            case 'ArrowRight':
                if (options.onArrowRight) {
                    if (options.preventDefault) event.preventDefault();
                    options.onArrowRight();
                }
                break;
            case 'Home':
                if (options.onHome) {
                    if (options.preventDefault) event.preventDefault();
                    options.onHome();
                }
                break;
            case 'End':
                if (options.onEnd) {
                    if (options.preventDefault) event.preventDefault();
                    options.onEnd();
                }
                break;
            case 'Tab':
                if (options.onTab) {
                    options.onTab(shiftKey);
                }
                break;
        }
    }, [options]);

    return { onKeyDown: handleKeyDown };
}

const HIGH_CONTRAST_KEY = 'portal_guru_high_contrast';

export function useHighContrast() {
    const [isHighContrast, setIsHighContrast] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem(HIGH_CONTRAST_KEY) === 'true';
    });

    useEffect(() => {
        if (isHighContrast) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
        localStorage.setItem(HIGH_CONTRAST_KEY, String(isHighContrast));
    }, [isHighContrast]);

    const toggle = useCallback(() => {
        setIsHighContrast(previous => !previous);
    }, []);

    return { isHighContrast, setHighContrast: setIsHighContrast, toggle };
}

export function useReducedMotion() {
    const [reducedMotion, setReducedMotion] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

        const handleChange = (event: MediaQueryListEvent) => {
            setReducedMotion(event.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        if (reducedMotion) {
            document.documentElement.classList.add('reduce-motion');
        } else {
            document.documentElement.classList.remove('reduce-motion');
        }
    }, [reducedMotion]);

    return reducedMotion;
}
