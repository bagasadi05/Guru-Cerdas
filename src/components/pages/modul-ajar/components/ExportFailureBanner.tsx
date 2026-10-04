import React from 'react';
import { AlertTriangle, Printer, RefreshCw, X } from 'lucide-react';

export interface ExportFailure {
  message: string;
  onRetry?: () => void;
  onPrintFallback?: () => void;
}

interface ExportFailureBannerProps {
  failure: ExportFailure;
  onDismiss: () => void;
  tone?: 'light' | 'dark';
}

export const ExportFailureBanner: React.FC<ExportFailureBannerProps> = ({
  failure,
  onDismiss,
  tone = 'light',
}) => {
  const isDark = tone === 'dark';
  const actionClass = isDark
    ? 'bg-white/10 hover:bg-white/20 text-white'
    : 'bg-white hover:bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/60 dark:hover:bg-red-900/60 dark:text-red-200 dark:border-red-900';

  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2 text-xs shrink-0 ${
        isDark
          ? 'bg-red-900/70 text-red-50 border-b border-red-800'
          : 'bg-red-50 text-red-700 border-b border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60'
      }`}
    >
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span className="flex-1 min-w-[12rem] font-medium">{failure.message}</span>
      {failure.onRetry && (
        <button
          type="button"
          onClick={failure.onRetry}
          className={`h-11 sm:h-8 px-3 sm:px-2.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer ${actionClass}`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Coba lagi
        </button>
      )}
      {failure.onPrintFallback && (
        <button
          type="button"
          onClick={failure.onPrintFallback}
          className={`h-11 sm:h-8 px-3 sm:px-2.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer ${actionClass}`}
        >
          <Printer className="w-3.5 h-3.5" />
          Cetak lewat browser
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Tutup pesan"
        className={`h-11 w-11 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center cursor-pointer ${
          isDark ? 'hover:bg-white/10' : 'hover:bg-red-100 dark:hover:bg-red-900/40'
        }`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
