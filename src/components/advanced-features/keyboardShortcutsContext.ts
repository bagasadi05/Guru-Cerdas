import { createContext } from 'react';

export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  description: string;
  category: string;
  action: () => void;
}

export interface KeyboardShortcutsContextValue {
  shortcuts: KeyboardShortcut[];
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (key: string, modifiers?: string[]) => void;
}

export const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);
