import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    action: () => void;
    description: string;
}

interface UseKeyboardShortcutsOptions {
    shortcuts: ShortcutConfig[];
    enabled?: boolean;
}

/**
 * Hook to manage global keyboard shortcuts
 * 
 * Usage:
 * ```tsx
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     { key: 'k', ctrlKey: true, action: () => openSearch(), description: 'Open search' },
 *     { key: 's', ctrlKey: true, action: () => save(), description: 'Save' },
 *     { key: 'Escape', action: () => closeModal(), description: 'Close modal' },
 *   ]
 * });
 * ```
 */
export const useKeyboardShortcuts = ({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) => {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!enabled) return;

        // Ignore if typing in input/textarea
        const target = event.target as HTMLElement;
        if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
        ) {
            // Still allow Escape
            if (event.key !== 'Escape') return;
        }

        for (const shortcut of shortcuts) {
            const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
            const ctrlMatch = !!shortcut.ctrlKey === (event.ctrlKey || event.metaKey);
            const shiftMatch = !!shortcut.shiftKey === event.shiftKey;
            const altMatch = !!shortcut.altKey === event.altKey;

            if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
                event.preventDefault();
                shortcut.action();
                break;
            }
        }
    }, [shortcuts, enabled]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
};

// Predefined shortcuts for the app
export const APP_SHORTCUTS = {
    SEARCH: { key: 'k', ctrlKey: true, description: 'Buka pencarian' },
    SAVE: { key: 's', ctrlKey: true, description: 'Simpan' },
    CLOSE: { key: 'Escape', description: 'Tutup modal/popup' },
    NEW: { key: 'n', ctrlKey: true, description: 'Tambah baru' },
    REFRESH: { key: 'r', ctrlKey: true, shiftKey: true, description: 'Refresh data' },
    HELP: { key: '/', shiftKey: true, description: 'Tampilkan bantuan' },
} as const;

// Component to display available shortcuts
export const KeyboardShortcutHelper: React.FC<{
    shortcuts: { key: string; modifier?: string; description: string }[];
    className?: string;
}> = ({ shortcuts, className = '' }) => {
    return (
        <div className={`p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 ${className}`}>
            <h3 className="font-bold text-slate-900 dark:text-white mb-3">Pintasan Keyboard</h3>
            <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                            {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1">
                            {shortcut.modifier && (
                                <kbd className="px-2 py-1 text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                                    {shortcut.modifier}
                                </kbd>
                            )}
                            <kbd className="px-2 py-1 text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                                {shortcut.key}
                            </kbd>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default useKeyboardShortcuts;
