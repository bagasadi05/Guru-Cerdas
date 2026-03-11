import { useContext } from 'react';
import { KeyboardShortcutsContext } from './keyboardShortcutsContext';

export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider');
  }
  return context;
};
