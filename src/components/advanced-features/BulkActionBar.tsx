import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { MotionDiv, AnimatePresence } from '../ui/MotionComponents';

export interface BulkAction {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'danger';
  disabled?: boolean;
  onClick: (selectedIds: string[]) => void | Promise<void>;
}

export interface BulkActionBarProps {
  selectedCount: number;
  selectedIds?: string[];
  totalCount?: number;
  itemLabel?: string;
  actions: BulkAction[];
  onClear: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  isAllSelected?: boolean;
  position?: 'top' | 'bottom';
  className?: string;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  selectedIds = [],
  totalCount,
  itemLabel = 'item',
  actions,
  onClear,
  onSelectAll,
  onDeselectAll,
  isAllSelected = false,
  position = 'top',
  className = '',
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Dismiss on Escape key
  useEffect(() => {
    if (selectedCount === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCount, onClear]);

  const handleAction = async (action: BulkAction) => {
    if (action.disabled || loadingAction !== null) return;
    setLoadingAction(action.id);
    try {
      await action.onClick(selectedIds);
    } finally {
      setLoadingAction(null);
    }
  };

  const getVariantStyles = (variant: BulkAction['variant'] = 'default') => {
    switch (variant) {
      case 'primary':
        return 'bg-emerald-700 hover:bg-emerald-800 text-white';
      case 'success':
        return 'bg-emerald-700 hover:bg-emerald-800 text-white';
      case 'danger':
        return 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 active:scale-95';
      case 'default':
      default:
        return 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 active:scale-95';
    }
  };

  const posClasses =
    position === 'top'
      ? 'top-20 lg:top-24'
      : 'bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:bottom-6';
  const animInitial =
    position === 'top' ? { opacity: 0, y: -25, scale: 0.96 } : { opacity: 0, y: 35, scale: 0.96 };
  const animExit =
    position === 'top' ? { opacity: 0, y: -20, scale: 0.96 } : { opacity: 0, y: 25, scale: 0.96 };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={`fixed ${posClasses} inset-x-3 z-40 flex justify-center pointer-events-none`}>
      <AnimatePresence>
        {selectedCount > 0 && (
          <MotionDiv
            initial={animInitial}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={animExit}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role="toolbar"
            aria-label="Tindakan untuk pilihan"
            className={`pointer-events-auto w-full max-w-5xl min-w-0 flex items-center gap-2 rounded-lg bg-slate-900 text-white px-2 py-2 shadow-lg border border-slate-600 ${className}`}
          >
            {/* Badge selection counter */}
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 text-slate-100 shrink-0"
              aria-live="polite"
            >
              <span className="flex h-6 min-w-6 items-center justify-center rounded bg-emerald-700 text-white text-sm font-bold">
                {selectedCount}
              </span>
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                {itemLabel} <span className="hidden sm:inline">dipilih</span>
              </span>
            </div>

            {/* Optional Quick Select All / Deselect All */}
            {(onSelectAll || onDeselectAll) && totalCount !== undefined && totalCount > 0 && (
              <button
                type="button"
                onClick={isAllSelected ? onDeselectAll : onSelectAll}
                className="hidden md:inline-flex min-h-[44px] items-center px-2 py-1 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-white"
                title={isAllSelected ? 'Batalkan pilih semua' : `Pilih semua (${totalCount})`}
              >
                {isAllSelected ? 'Batal Semua' : `Pilih Semua (${totalCount})`}
              </button>
            )}

            <div className="h-6 w-px bg-slate-700/80 shrink-0" />

            {/* Action buttons */}
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1">
              {actions.map((action) => {
                const isLoading = loadingAction === action.id;
                const isDisabled = action.disabled || (loadingAction !== null && !isLoading);

                return (
                  <button
                    type="button"
                    key={action.id}
                    onClick={() => handleAction(action)}
                    onFocus={event => event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })}
                    disabled={isDisabled || isLoading}
                    title={action.label}
                    className={`flex shrink-0 min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${getVariantStyles(
                      action.variant,
                    )} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    ) : (
                      <span className="shrink-0">{action.icon}</span>
                    )}
                    {action.shortLabel ? (
                      <>
                        <span className="hidden sm:inline whitespace-nowrap">{action.label}</span>
                        <span className="sm:hidden whitespace-nowrap">{action.shortLabel}</span>
                      </>
                    ) : (
                      <span className="whitespace-nowrap">{action.label}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="h-6 w-px bg-slate-700/80 shrink-0" />

            {/* Cancel button */}
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-200 hover:text-white hover:bg-white/10 transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-white"
              aria-label="Batalkan pilihan (Esc)"
              title="Batalkan pilihan (Esc)"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
};
