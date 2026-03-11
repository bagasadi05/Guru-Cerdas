import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardShortcutsContext,
  type KeyboardShortcut,
} from './keyboardShortcutsContext';

export const KeyboardShortcutsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts((prev) => [
      ...prev.filter(
        (existing) =>
          !(
            existing.key === shortcut.key &&
            JSON.stringify(existing.modifiers) === JSON.stringify(shortcut.modifiers)
          )
      ),
      shortcut,
    ]);
  }, []);

  const unregisterShortcut = useCallback((key: string, modifiers?: string[]) => {
    setShortcuts((prev) =>
      prev.filter(
        (shortcut) =>
          !(
            shortcut.key === key &&
            JSON.stringify(shortcut.modifiers) === JSON.stringify(modifiers)
          )
      )
    );
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as Element).tagName)) {
        return;
      }

      for (const shortcut of shortcuts) {
        const modifiers = shortcut.modifiers || [];
        const ctrlMatch = modifiers.includes('ctrl') === (event.ctrlKey || event.metaKey);
        const altMatch = modifiers.includes('alt') === event.altKey;
        const shiftMatch = modifiers.includes('shift') === event.shiftKey;

        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          ctrlMatch &&
          altMatch &&
          shiftMatch
        ) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  return (
    <KeyboardShortcutsContext.Provider value={{ shortcuts, registerShortcut, unregisterShortcut }}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
};
