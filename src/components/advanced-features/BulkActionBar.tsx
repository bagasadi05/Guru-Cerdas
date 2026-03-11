import React, { useState } from 'react';
import { Loader2, X } from 'lucide-react';

export interface BulkAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant?: 'default' | 'danger';
  onClick: (selectedIds: string[]) => void | Promise<void>;
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClear: () => void;
  className?: string;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  actions,
  onClear,
  className = '',
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (selectedCount === 0) return null;

  const handleAction = async (action: BulkAction, selectedIds: string[]) => {
    setLoadingAction(action.id);
    try {
      await action.onClick(selectedIds);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div
      className={`fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl animate-slide-up ${className}`}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 font-bold">
          {selectedCount}
        </div>
        <span className="text-sm">item dipilih</span>
      </div>

      <div className="h-6 w-px bg-slate-700" />

      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action, [])}
            disabled={loadingAction !== null}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              action.variant === 'danger' ? 'text-red-400 hover:bg-red-500/20' : 'hover:bg-white/10'
            }`}
          >
            {loadingAction === action.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              action.icon
            )}
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        ))}
      </div>

      <div className="h-6 w-px bg-slate-700" />

      <button onClick={onClear} className="rounded-lg p-2 hover:bg-white/10" aria-label="Batalkan pilihan">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
