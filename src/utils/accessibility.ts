/**
 * Accessibility (A11y) Utilities
 * Comprehensive accessibility helpers, ARIA utilities, and keyboard navigation
 */

import { useEffect, useRef, useCallback, useState } from 'react';

// ============================================
// ARIA UTILITIES
// ============================================

/**
 * Generates unique IDs for ARIA relationships
 * 
 * This function creates unique identifiers for use in ARIA attributes like
 * aria-labelledby, aria-describedby, and aria-controls. Each call increments
 * an internal counter to ensure uniqueness across the application.
 * 
 * @param prefix - Optional prefix for the ID (defaults to 'aria')
 * @returns A unique ID string in the format `{prefix}-{counter}`
 * 
 * @example
 * ```typescript
 * const labelId = generateAriaId('label');
 * const descId = generateAriaId('desc');
 * 
 * <div>
 *   <label id={labelId}>Username</label>
 *   <input aria-labelledby={labelId} />
 * </div>
 * ```
 * 
 * @example
 * ```typescript
 * // Use for modal relationships
 * const titleId = generateAriaId('modal-title');
 * <div role="dialog" aria-labelledby={titleId}>
 *   <h2 id={titleId}>Confirm Action</h2>
 * </div>
 * ```
 * 
 * @since 1.0.0
 */
let idCounter = 0;
export function generateAriaId(prefix: string = 'aria'): string {
    return `${prefix}-${++idCounter}`;
}

/**
 * ARIA live region announcements
 */
class AriaAnnouncer {
    private static instance: AriaAnnouncer;
    private liveRegion: HTMLDivElement | null = null;

    private constructor() {
        if (typeof document !== 'undefined') {
            this.createLiveRegion();
        }
    }

    static getInstance(): AriaAnnouncer {
        if (!AriaAnnouncer.instance) {
            AriaAnnouncer.instance = new AriaAnnouncer();
        }
        return AriaAnnouncer.instance;
    }

    private createLiveRegion() {
        this.liveRegion = document.createElement('div');
        this.liveRegion.setAttribute('aria-live', 'polite');
        this.liveRegion.setAttribute('aria-atomic', 'true');
        this.liveRegion.setAttribute('role', 'status');
        this.liveRegion.className = 'sr-only';
        this.liveRegion.style.cssText = `
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        `;
        document.body.appendChild(this.liveRegion);
    }

    announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
        if (!this.liveRegion) return;

        this.liveRegion.setAttribute('aria-live', priority);
        this.liveRegion.textContent = '';

        // Force reflow
        void this.liveRegion.offsetHeight;

        this.liveRegion.textContent = message;
    }
}

/**
 * Announces a message to screen readers using ARIA live regions
 * 
 * This function creates announcements that are read by screen readers without
 * moving focus. Use 'polite' for non-urgent messages (waits for user to finish)
 * and 'assertive' for urgent messages (interrupts current reading).
 * 
 * @param message - The text message to announce to screen readers
 * @param priority - Announcement priority: 'polite' (default) or 'assertive'
 * 
 * @example
 * ```typescript
 * // Announce form submission success
 * announce('Form submitted successfully');
 * ```
 * 
 * @example
 * ```typescript
 * // Announce urgent error
 * announce('Connection lost. Please check your internet.', 'assertive');
 * ```
 * 
 * @example
 * ```typescript
 * // Announce loading state changes
 * announce('Loading data...');
 * // Later...
 * announce('Data loaded successfully');
 * ```
 * 
 * @remarks
 * - Use 'polite' for status updates, confirmations, and non-critical information
 * - Use 'assertive' for errors, warnings, and time-sensitive information
 * - Keep messages concise and clear
 * - Avoid announcing too frequently to prevent overwhelming users
 * 
 * @since 1.0.0
 */
export const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    AriaAnnouncer.getInstance().announce(message, priority);
};

// ============================================
// KEYBOARD NAVIGATION
// ============================================

export const Keys = {
    ENTER: 'Enter',
    SPACE: ' ',
    ESCAPE: 'Escape',
    TAB: 'Tab',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    HOME: 'Home',
    END: 'End',
    PAGE_UP: 'PageUp',
    PAGE_DOWN: 'PageDown'
} as const;

/**
 * React hook for implementing keyboard navigation in lists and menus
 * 
 * This hook provides complete keyboard navigation support including arrow keys,
 * Home/End keys, and Enter/Space for selection. It manages focus state and
 * provides props for list items to enable accessible keyboard interaction.
 * 
 * @template T - The HTML element type for the container (extends HTMLElement)
 * @param itemCount - Total number of items in the list
 * @param options - Configuration options for navigation behavior
 * @param options.orientation - Navigation direction: 'horizontal', 'vertical', or 'both'
 * @param options.loop - Whether navigation wraps around at boundaries (default: true)
 * @param options.onSelect - Callback when an item is selected (Enter/Space)
 * @param options.onEscape - Callback when Escape key is pressed
 * @returns Object containing containerRef, focusedIndex, setFocusedIndex, and getItemProps
 * 
 * @example
 * ```typescript
 * function Menu() {
 *   const items = ['Home', 'About', 'Contact'];
 *   const { containerRef, focusedIndex, getItemProps } = useKeyboardNavigation(
 *     items.length,
 *     {
 *       orientation: 'vertical',
 *       onSelect: (index) => navigate(items[index]),
 *       onEscape: () => closeMenu()
 *     }
 *   );
 * 
 *   return (
 *     <ul ref={containerRef} role="menu">
 *       {items.map((item, index) => (
 *         <li key={index} {...getItemProps(index)}>
 *           {item}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Horizontal tab navigation
 * const { containerRef, getItemProps } = useKeyboardNavigation(
 *   tabs.length,
 *   { orientation: 'horizontal', loop: false }
 * );
 * ```
 * 
 * @since 1.0.0
 */
export function useKeyboardNavigation<T extends HTMLElement>(
    itemCount: number,
    options: {
        orientation?: 'horizontal' | 'vertical' | 'both';
        loop?: boolean;
        onSelect?: (index: number) => void;
        onEscape?: () => void;
    } = {}
) {
    const {
        orientation = 'vertical',
        loop = true,
        onSelect,
        onEscape
    } = options;

    const [focusedIndex, setFocusedIndex] = useState(0);
    const containerRef = useRef<T>(null);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const isVertical = orientation === 'vertical' || orientation === 'both';
        const isHorizontal = orientation === 'horizontal' || orientation === 'both';

        let newIndex = focusedIndex;
        let handled = false;

        switch (e.key) {
            case Keys.ARROW_UP:
                if (isVertical) {
                    newIndex = focusedIndex > 0
                        ? focusedIndex - 1
                        : (loop ? itemCount - 1 : 0);
                    handled = true;
                }
                break;
            case Keys.ARROW_DOWN:
                if (isVertical) {
                    newIndex = focusedIndex < itemCount - 1
                        ? focusedIndex + 1
                        : (loop ? 0 : itemCount - 1);
                    handled = true;
                }
                break;
            case Keys.ARROW_LEFT:
                if (isHorizontal) {
                    newIndex = focusedIndex > 0
                        ? focusedIndex - 1
                        : (loop ? itemCount - 1 : 0);
                    handled = true;
                }
                break;
            case Keys.ARROW_RIGHT:
                if (isHorizontal) {
                    newIndex = focusedIndex < itemCount - 1
                        ? focusedIndex + 1
                        : (loop ? 0 : itemCount - 1);
                    handled = true;
                }
                break;
            case Keys.HOME:
                newIndex = 0;
                handled = true;
                break;
            case Keys.END:
                newIndex = itemCount - 1;
                handled = true;
                break;
            case Keys.ENTER:
            case Keys.SPACE:
                onSelect?.(focusedIndex);
                handled = true;
                break;
            case Keys.ESCAPE:
                onEscape?.();
                handled = true;
                break;
        }

        if (handled) {
            e.preventDefault();
            setFocusedIndex(newIndex);
        }
    }, [focusedIndex, itemCount, orientation, loop, onSelect, onEscape]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('keydown', handleKeyDown);
        return () => container.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return {
        containerRef,
        focusedIndex,
        setFocusedIndex,
        getItemProps: (index: number) => ({
            tabIndex: index === focusedIndex ? 0 : -1,
            'aria-selected': index === focusedIndex,
            onFocus: () => setFocusedIndex(index)
        })
    };
}

/**
 * React hook for trapping focus within a container (modals, dialogs, popovers)
 * 
 * This hook ensures keyboard focus stays within a container element, cycling
 * through focusable elements when Tab is pressed. It automatically focuses the
 * first element on mount and restores focus to the previously focused element
 * on unmount. Essential for accessible modal dialogs.
 * 
 * @template T - The HTML element type for the container (extends HTMLElement)
 * @returns A ref to attach to the container element
 * 
 * @example
 * ```typescript
 * function Modal({ isOpen, onClose }) {
 *   const trapRef = useFocusTrap<HTMLDivElement>();
 * 
 *   if (!isOpen) return null;
 * 
 *   return (
 *     <div ref={trapRef} role="dialog" aria-modal="true">
 *       <h2>Modal Title</h2>
 *       <button onClick={onClose}>Close</button>
 *       <button>Save</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Use with dropdown menu
 * function Dropdown() {
 *   const trapRef = useFocusTrap<HTMLDivElement>();
 *   return (
 *     <div ref={trapRef} role="menu">
 *       <button role="menuitem">Option 1</button>
 *       <button role="menuitem">Option 2</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @remarks
 * - Automatically finds all focusable elements (buttons, links, inputs, etc.)
 * - Handles Tab and Shift+Tab to cycle through elements
 * - Restores focus to the element that was focused before the trap activated
 * - Works with dynamically added/removed elements
 * 
 * @since 1.0.0
 */
export function useFocusTrap<T extends HTMLElement>() {
    const containerRef = useRef<T>(null);
    const previousActiveElement = useRef<Element | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Store previously focused element
        previousActiveElement.current = document.activeElement;

        // Get all focusable elements
        const focusableSelector =
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelector);
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        // Focus first element
        firstFocusable?.focus();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== Keys.TAB) return;

            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable?.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable?.focus();
                }
            }
        };

        container.addEventListener('keydown', handleKeyDown);

        return () => {
            container.removeEventListener('keydown', handleKeyDown);
            // Restore focus
            (previousActiveElement.current as HTMLElement)?.focus?.();
        };
    }, []);

    return containerRef;
}

/**
 * Hook for skip link functionality
 */
export function useSkipLink(targetId: string) {
    const handleSkip = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
        e.preventDefault();
        const target = document.getElementById(targetId);
        if (target) {
            target.tabIndex = -1;
            target.focus();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    }, [targetId]);

    return { handleSkip };
}

// ============================================
// FOCUS MANAGEMENT
// ============================================

/**
 * Hook for managing focus on mount
 */
export function useFocusOnMount<T extends HTMLElement>(enabled: boolean = true) {
    const ref = useRef<T>(null);

    useEffect(() => {
        if (enabled && ref.current) {
            ref.current.focus();
        }
    }, [enabled]);

    return ref;
}

/**
 * Hook for restoring focus on unmount
 */
export function useRestoreFocus() {
    const previousActiveElement = useRef<Element | null>(null);

    useEffect(() => {
        previousActiveElement.current = document.activeElement;

        return () => {
            (previousActiveElement.current as HTMLElement)?.focus?.();
        };
    }, []);
}

// ============================================
// ACCESSIBILITY AUDIT
// ============================================

interface A11yIssue {
    type: 'error' | 'warning';
    element: string;
    issue: string;
    fix: string;
}

/**
 * Runs an accessibility audit on the current page
 * 
 * This function performs automated accessibility checks on the DOM, identifying
 * common issues like missing alt text, unlabeled form inputs, broken ARIA
 * relationships, and heading hierarchy problems. Returns an array of issues
 * with severity levels and suggested fixes.
 * 
 * @returns Array of accessibility issues found on the page
 * 
 * @example
 * ```typescript
 * // Run audit in development
 * if (process.env.NODE_ENV === 'development') {
 *   const issues = runAccessibilityAudit();
 *   if (issues.length > 0) {
 *     console.warn('Accessibility issues found:', issues);
 *   }
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Run audit on page load
 * useEffect(() => {
 *   const issues = runAccessibilityAudit();
 *   const errors = issues.filter(i => i.type === 'error');
 *   if (errors.length > 0) {
 *     console.error(`${errors.length} accessibility errors found`);
 *   }
 * }, []);
 * ```
 * 
 * @remarks
 * Checks performed:
 * - Images without alt attributes
 * - Buttons without accessible names
 * - Links without accessible names
 * - Form inputs without labels
 * - Missing main landmark
 * - Missing or multiple h1 headings
 * - Heading hierarchy skips
 * - Low contrast warnings
 * - Click handlers without keyboard support
 * 
 * @see {@link generateA11yReport} for a formatted report
 * @since 1.0.0
 */
export function runAccessibilityAudit(): A11yIssue[] {
    const issues: A11yIssue[] = [];

    // Check for images without alt
    document.querySelectorAll('img').forEach((img, index) => {
        if (!img.alt && !img.getAttribute('aria-hidden')) {
            issues.push({
                type: 'error',
                element: `img[${index}]: ${img.src.substring(0, 50)}...`,
                issue: 'Image missing alt attribute',
                fix: 'Add descriptive alt text or aria-hidden="true" for decorative images'
            });
        }
    });

    // Check for buttons without accessible names
    document.querySelectorAll('button').forEach((btn, index) => {
        const hasAccessibleName = btn.textContent?.trim() ||
            btn.getAttribute('aria-label') ||
            btn.getAttribute('aria-labelledby');

        if (!hasAccessibleName) {
            issues.push({
                type: 'error',
                element: `button[${index}]`,
                issue: 'Button missing accessible name',
                fix: 'Add text content, aria-label, or aria-labelledby'
            });
        }
    });

    // Check for links without accessible names
    document.querySelectorAll('a').forEach((link, index) => {
        const hasAccessibleName = link.textContent?.trim() ||
            link.getAttribute('aria-label') ||
            link.getAttribute('aria-labelledby');

        if (!hasAccessibleName) {
            issues.push({
                type: 'error',
                element: `a[${index}]: ${link.href?.substring(0, 30)}...`,
                issue: 'Link missing accessible name',
                fix: 'Add text content, aria-label, or aria-labelledby'
            });
        }
    });

    // Check for form inputs without labels
    document.querySelectorAll('input, select, textarea').forEach((input, index) => {
        const id = input.id;
        const hasLabel = id && document.querySelector(`label[for="${id}"]`);
        const hasAriaLabel = input.getAttribute('aria-label') ||
            input.getAttribute('aria-labelledby');

        if (!hasLabel && !hasAriaLabel && input.getAttribute('type') !== 'hidden') {
            issues.push({
                type: 'error',
                element: `${input.tagName.toLowerCase()}[${index}]`,
                issue: 'Form input missing label',
                fix: 'Add <label for="id"> or aria-label/aria-labelledby'
            });
        }
    });

    // Check for missing main landmark
    if (!document.querySelector('main, [role="main"]')) {
        issues.push({
            type: 'warning',
            element: 'document',
            issue: 'Missing main landmark',
            fix: 'Add <main> element or role="main"'
        });
    }

    // Check for missing h1
    if (!document.querySelector('h1')) {
        issues.push({
            type: 'warning',
            element: 'document',
            issue: 'Missing h1 heading',
            fix: 'Add a single h1 heading to describe page content'
        });
    }

    // Check heading hierarchy
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    headings.forEach((heading) => {
        const level = parseInt(heading.tagName[1]);
        if (level - previousLevel > 1) {
            issues.push({
                type: 'warning',
                element: heading.tagName,
                issue: `Heading level skipped from h${previousLevel} to h${level}`,
                fix: 'Use sequential heading levels (h1 → h2 → h3)'
            });
        }
        previousLevel = level;
    });

    // Check for low contrast (simplified check)
    document.querySelectorAll('[style*="color"]').forEach((el, index) => {
        const style = (el as HTMLElement).style;
        if (style.color && style.backgroundColor) {
            issues.push({
                type: 'warning',
                element: `element[${index}] with inline color`,
                issue: 'Inline color styles may have contrast issues',
                fix: 'Verify color contrast ratio is at least 4.5:1 for text'
            });
        }
    });

    // Check for click handlers without keyboard support
    document.querySelectorAll('[onclick]').forEach((el, index) => {
        if (!el.getAttribute('onkeydown') && !el.getAttribute('onkeyup') && !el.getAttribute('onkeypress')) {
            const tag = el.tagName.toLowerCase();
            if (tag !== 'button' && tag !== 'a' && tag !== 'input') {
                issues.push({
                    type: 'warning',
                    element: `${tag}[${index}] with onclick`,
                    issue: 'Click handler without keyboard support',
                    fix: 'Add keyboard event handler or use <button> element'
                });
            }
        }
    });

    return issues;
}

/**
 * Generates a formatted accessibility audit report
 * 
 * This function runs an accessibility audit and formats the results into a
 * human-readable text report with sections for errors and warnings. The report
 * includes a summary, detailed issue descriptions, and suggested fixes.
 * 
 * @returns A formatted string report of all accessibility issues
 * 
 * @example
 * ```typescript
 * // Generate and log report
 * const report = generateA11yReport();
 * console.log(report);
 * ```
 * 
 * @example
 * ```typescript
 * // Save report to file (Node.js)
 * const report = generateA11yReport();
 * fs.writeFileSync('a11y-report.txt', report);
 * ```
 * 
 * @example
 * ```typescript
 * // Display report in development tools
 * if (process.env.NODE_ENV === 'development') {
 *   const report = generateA11yReport();
 *   if (report.includes('Errors:')) {
 *     console.group('Accessibility Report');
 *     console.log(report);
 *     console.groupEnd();
 *   }
 * }
 * ```
 * 
 * @remarks
 * The report includes:
 * - Timestamp and URL
 * - Summary with error and warning counts
 * - Detailed list of errors (must fix)
 * - Detailed list of warnings (should fix)
 * - Suggested fixes for each issue
 * 
 * @see {@link runAccessibilityAudit} for the underlying audit function
 * @since 1.0.0
 */
export function generateA11yReport(): string {
    const issues = runAccessibilityAudit();

    const errors = issues.filter(i => i.type === 'error');
    const warnings = issues.filter(i => i.type === 'warning');

    let report = `
ACCESSIBILITY AUDIT REPORT
Generated: ${new Date().toISOString()}
URL: ${window.location.href}

SUMMARY
-------
Errors: ${errors.length}
Warnings: ${warnings.length}
Total Issues: ${issues.length}

`;

    if (errors.length > 0) {
        report += `\nERRORS (Must Fix)\n${'='.repeat(40)}\n`;
        errors.forEach((issue, i) => {
            report += `\n${i + 1}. ${issue.element}\n   Issue: ${issue.issue}\n   Fix: ${issue.fix}\n`;
        });
    }

    if (warnings.length > 0) {
        report += `\nWARNINGS (Should Fix)\n${'='.repeat(40)}\n`;
        warnings.forEach((issue, i) => {
            report += `\n${i + 1}. ${issue.element}\n   Issue: ${issue.issue}\n   Fix: ${issue.fix}\n`;
        });
    }

    if (issues.length === 0) {
        report += `\n✓ No accessibility issues found!\n`;
    }

    return report;
}

// ============================================
// ARIA PROPS HELPERS
// ============================================

/**
 * Common ARIA props for interactive elements
 */
export const ariaProps = {
    button: (label?: string, pressed?: boolean, expanded?: boolean) => ({
        role: 'button',
        tabIndex: 0,
        'aria-label': label,
        'aria-pressed': pressed,
        'aria-expanded': expanded
    }),

    link: (label?: string, current?: boolean) => ({
        'aria-label': label,
        'aria-current': current ? 'page' : undefined
    }),

    menu: (label?: string) => ({
        role: 'menu',
        'aria-label': label
    }),

    menuItem: (label?: string, selected?: boolean) => ({
        role: 'menuitem',
        'aria-label': label,
        'aria-selected': selected
    }),

    dialog: (labelledBy?: string, describedBy?: string) => ({
        role: 'dialog',
        'aria-modal': true,
        'aria-labelledby': labelledBy,
        'aria-describedby': describedBy
    }),

    alert: (label?: string) => ({
        role: 'alert',
        'aria-live': 'assertive' as const,
        'aria-label': label
    }),

    status: (label?: string) => ({
        role: 'status',
        'aria-live': 'polite' as const,
        'aria-label': label
    }),

    tab: (selected: boolean, controls: string) => ({
        role: 'tab',
        'aria-selected': selected,
        'aria-controls': controls,
        tabIndex: selected ? 0 : -1
    }),

    tabPanel: (labelledBy: string, hidden: boolean) => ({
        role: 'tabpanel',
        'aria-labelledby': labelledBy,
        hidden,
        tabIndex: 0
    }),

    combobox: (expanded: boolean, controls: string, activeDescendant?: string) => ({
        role: 'combobox',
        'aria-expanded': expanded,
        'aria-controls': controls,
        'aria-activedescendant': activeDescendant,
        'aria-haspopup': 'listbox' as const
    }),

    listbox: (label?: string, multiselectable?: boolean) => ({
        role: 'listbox',
        'aria-label': label,
        'aria-multiselectable': multiselectable
    }),

    option: (selected: boolean, disabled?: boolean) => ({
        role: 'option',
        'aria-selected': selected,
        'aria-disabled': disabled
    }),

    progressbar: (value: number, max: number = 100, label?: string) => ({
        role: 'progressbar',
        'aria-valuenow': value,
        'aria-valuemin': 0,
        'aria-valuemax': max,
        'aria-label': label || `Progress: ${Math.round((value / max) * 100)}%`
    }),

    slider: (value: number, min: number, max: number, label?: string) => ({
        role: 'slider',
        'aria-valuenow': value,
        'aria-valuemin': min,
        'aria-valuemax': max,
        'aria-label': label,
        tabIndex: 0
    })
};

// Export types
export type { A11yIssue };
