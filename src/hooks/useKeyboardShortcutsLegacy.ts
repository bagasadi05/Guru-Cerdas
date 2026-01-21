import { useEffect, useRef } from 'react';

interface ShortcutMap {
    [key: string]: () => void;
}

interface UseKeyboardShortcutsOptions {
    enabled?: boolean;
    preventDefault?: boolean;
}

/**
 * Hook for registering keyboard shortcuts (Legacy Version)
 * 
 * @example
 * useKeyboardShortcuts({
 *     'ctrl+s': () => handleSave(),
 *     'ctrl+a': () => selectAll(),
 *     'escape': () => clearSelection(),
 * });
 */
export const useKeyboardShortcuts = (
    shortcuts: ShortcutMap,
    options: UseKeyboardShortcutsOptions = {}
) => {
    const { enabled = true, preventDefault = true } = options;
    const shortcutsRef = useRef(shortcuts);

    // Update ref when shortcuts change
    useEffect(() => {
        shortcutsRef.current = shortcuts;
    }, [shortcuts]);

    useEffect(() => {
        if (!enabled) return;

        const handler = (e: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in inputs (unless it's a modifier key combo)
            const isInputFocused =
                document.activeElement?.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA' ||
                document.activeElement?.tagName === 'SELECT';

            // Build the key string
            const parts: string[] = [];
            if (e.ctrlKey || e.metaKey) parts.push('ctrl');
            if (e.shiftKey) parts.push('shift');
            if (e.altKey) parts.push('alt');
            parts.push(e.key.toLowerCase());

            const key = parts.join('+');

            // Check if we have a handler for this shortcut
            if (shortcutsRef.current[key]) {
                // Allow modifier key combos even in inputs
                if (isInputFocused && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    return;
                }

                if (preventDefault) {
                    e.preventDefault();
                }
                shortcutsRef.current[key]();
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [enabled, preventDefault]);
};

export default useKeyboardShortcuts;
