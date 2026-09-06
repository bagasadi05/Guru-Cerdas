import React, { useState, useEffect } from 'react';
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
        return 'bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-950/40 active:scale-95';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 active:scale-95';
      case 'danger':
        return 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 active:scale-95';
      case 'default':
      default:
        return 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 active:scale-95';
    }
  };

  const posClasses = position === 'top' ? 'top-20 lg:top-24' : 'bottom-20 sm:bottom-6';
  const animInitial = position === 'top' ? { opacity: 0, y: -25, scale: 0.96 } : { opacity: 0, y: 35, scale: 0.96 };
  const animExit = position === 'top' ? { opacity: 0, y: -20, scale: 0.96 } : { opacity: 0, y: 25, scale: 0.96 };

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <MotionDiv
          initial={animInitial}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={animExit}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`fixed ${posClasses} left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-1.5rem)] sm:max-w-none flex items-center gap-2 sm:gap-3 rounded-2xl bg-slate-900/95 text-white backdrop-blur-xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-2xl shadow-slate-950/60 border border-slate-700/80 ring-1 ring-white/10 ${className}`}
        >
          {/* Badge selection counter */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-brand-500/20 border border-brand-500/30 text-brand-300 shrink-0">
            <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-brand-600 text-white text-xs sm:text-sm font-bold shadow-sm">
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
              className="hidden md:inline-flex items-center px-2 py-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap"
              title={isAllSelected ? 'Batalkan pilih semua' : `Pilih semua (${totalCount})`}
            >
              {isAllSelected ? 'Batal Semua' : `Pilih Semua (${totalCount})`}
            </button>
          )}

          <div className="h-6 w-px bg-slate-700/80 shrink-0" />

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
            {actions.map((action) => {
              const isLoading = loadingAction === action.id;
              const isDisabled = action.disabled || (loadingAction !== null && !isLoading);

              return (
                <button
                  type="button"
                  key={action.id}
                  onClick={() => handleAction(action)}
                  disabled={isDisabled || isLoading}
                  title={action.label}
                  className={`flex items-center gap-1.5 sm:gap-2 rounded-xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium transition-all ${getVariantStyles(
                    action.variant
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
            className="rounded-xl p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label="Batalkan pilihan (Esc)"
            title="Batalkan pilihan (Esc)"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
};
