import React from 'react';
import { X } from 'lucide-react';

interface PerangkatAjarUndoBannerProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

export const PerangkatAjarUndoBanner: React.FC<PerangkatAjarUndoBannerProps> = ({
  message,
  onUndo,
  onDismiss,
}) => {
  return (
    <div
      role="status"
      className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 max-w-[calc(100vw-32px)] pl-4 pr-1.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs shadow-lg animate-fade-in"
    >
      <span className="truncate">{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="shrink-0 min-h-[36px] px-3 font-bold text-emerald-300 hover:text-emerald-200 rounded-lg hover:bg-white/10"
      >
        Batalkan
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Tutup"
        className="shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
