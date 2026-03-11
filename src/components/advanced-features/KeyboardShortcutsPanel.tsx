import React from 'react';
import { X } from 'lucide-react';
import { type KeyboardShortcut } from './keyboardShortcutsContext';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

export const KeyboardShortcutsPanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { shortcuts } = useKeyboardShortcuts();

  if (!isOpen) return null;

  const grouped = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'Utama';
    if (!acc[category]) acc[category] = [];
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-scale-in dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-1 text-sm font-mono dark:border-slate-700 dark:bg-slate-800">
              ⌘
            </kbd>
            Pintasan Keyboard
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">{category}</h3>
                <div className="space-y-3">
                  {items.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.modifiers?.map((modifier) => (
                          <kbd
                            key={modifier}
                            className="min-w-[24px] rounded border border-slate-200 bg-slate-100 px-2 py-1 text-center text-xs font-mono uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800"
                          >
                            {modifier === 'meta' ? '⌘' : modifier}
                          </kbd>
                        ))}
                        <kbd className="min-w-[24px] rounded border border-slate-200 bg-slate-100 px-2 py-1 text-center text-xs font-mono uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800">
                          {shortcut.key}
                        </kbd>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
          Tekan <kbd className="rounded border bg-white px-1 font-mono dark:bg-slate-700">?</kbd> atau{' '}
          <kbd className="rounded border bg-white px-1 font-mono dark:bg-slate-700">Shift + /</kbd> untuk membuka
          panel ini kapan saja
        </div>
      </div>
    </div>
  );
};
