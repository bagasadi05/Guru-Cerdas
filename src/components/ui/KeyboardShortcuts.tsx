import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface KeyboardShortcut {
    key: string;
    description: string;
    category: 'Navigation' | 'Actions' | 'General';
}

const shortcuts: KeyboardShortcut[] = [
    // Navigation
    { key: '/', description: 'Open search', category: 'Navigation' },
    { key: 'g → d', description: 'Go to Dashboard', category: 'Navigation' },
    { key: 'g → a', description: 'Go to Attendance', category: 'Navigation' },
    { key: 'g → s', description: 'Go to Students', category: 'Navigation' },
    { key: 'g → j', description: 'Go to Schedule', category: 'Navigation' },
    { key: 'g → t', description: 'Go to Tasks', category: 'Navigation' },

    // Actions
    { key: 'n', description: 'New item (context-specific)', category: 'Actions' },
    { key: 'e', description: 'Edit selected item', category: 'Actions' },
    { key: 'Delete', description: 'Delete selected item', category: 'Actions' },
    { key: 'Ctrl+S', description: 'Save changes', category: 'Actions' },
    { key: 'Ctrl+Enter', description: 'Submit form', category: 'Actions' },

    // General
    { key: '?', description: 'Show this help', category: 'General' },
    { key: 'Escape', description: 'Close modal/dialog', category: 'General' },
    { key: 'Ctrl+K', description: 'Command palette', category: 'General' },
    { key: 'Ctrl+/', description: 'Toggle theme', category: 'General' },
];

export const KeyboardShortcutsPanel: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Open shortcut panel with ? or Shift+/
            if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                setIsOpen(true);
            }
            // Close with Escape
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isOpen]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
        if (!acc[shortcut.category]) {
            acc[shortcut.category] = [];
        }
        acc[shortcut.category].push(shortcut);
        return acc;
    }, {} as Record<string, KeyboardShortcut[]>);

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
            role="dialog"
            aria-labelledby="shortcuts-title"
            aria-modal="true"
        >
            <div
                className="relative w-full max-w-2xl mx-4 animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700">
                    {/* Header */}
                    <div className="relative p-6 border-b border-slate-200 dark:border-slate-800">
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-600 to-purple-600 opacity-10 pointer-events-none"></div>
                        <div className="relative flex items-center justify-between">
                            <div>
                                <h2
                                    id="shortcuts-title"
                                    className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"
                                >
                                    <span className="text-indigo-600 dark:text-indigo-400">⌨️</span>
                                    Keyboard Shortcuts
                                </h2>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                    Navigate faster with these keyboard shortcuts
                                </p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                aria-label="Close shortcuts panel"
                            >
                                <svg
                                    className="w-5 h-5 text-slate-500 dark:text-slate-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
                        {Object.entries(groupedShortcuts).map(([category, items]) => (
                            <div key={category}>
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                                    {category}
                                </h3>
                                <div className="space-y-2">
                                    {items.map((shortcut, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                                {shortcut.description}
                                            </span>
                                            <kbd className="px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm">
                                                {shortcut.key}
                                            </kbd>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <p className="text-xs text-center text-slate-600 dark:text-slate-400">
                            Press <kbd className="px-2 py-1 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded">?</kbd> to toggle this panel
                        </p>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// Hook to use keyboard shortcuts
export const useKeyboardShortcuts = (callbacks: {
    onOpenSearch?: () => void;
    onNewItem?: () => void;
    onSave?: () => void;
}) => {
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            // Ignore shortcuts when typing in input fields (except for specific combinations)
            if (isInputField && !e.ctrlKey && !e.metaKey && e.key !== 'Escape') {
                return;
            }

            // Search shortcut
            if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                callbacks.onOpenSearch?.();
            }

            // New item shortcut
            if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !isInputField) {
                e.preventDefault();
                callbacks.onNewItem?.();
            }

            // Save shortcut
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                callbacks.onSave?.();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [callbacks]);
};

export default KeyboardShortcutsPanel;
