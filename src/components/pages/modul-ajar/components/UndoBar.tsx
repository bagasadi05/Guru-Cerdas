import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw } from 'lucide-react';

interface UndoBarProps {
  message: string;
  onUndo: () => void;
  /** Called when the undo window closes without Urungkan. */
  onExpire: () => void;
  durationMs?: number;
}

/**
 * Short-lived bar offering to undo the last action. The app-wide UndoToast
 * only works for actions recorded in UndoManager, which does not cover
 * lesson_plans.
 */
export const UndoBar: React.FC<UndoBarProps> = ({ message, onUndo, onExpire, durationMs = 10000 }) => {
  useEffect(() => {
    const timer = setTimeout(onExpire, durationMs);
    return () => clearTimeout(timer);
  }, [onExpire, durationMs]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 lg:bottom-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
    >
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-slate-900 text-white px-4 py-2.5 shadow-2xl border border-slate-700 max-w-[95vw]">
        <span className="text-sm">{message}</span>
        <button
          type="button"
          onClick={onUndo}
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 px-3 py-1.5 text-sm font-semibold cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          Urungkan
        </button>
      </div>
    </div>,
    document.body,
  );
};
