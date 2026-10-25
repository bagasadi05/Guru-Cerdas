import React from 'react';
import { Button } from '../../../../ui/Button';
import { AlertCircleIcon } from '../../../../Icons';

interface RegenerateConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const RegenerateConfirmModal: React.FC<RegenerateConfirmModalProps> = ({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="regen-confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        role="presentation"
        aria-hidden="true"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative z-10 bg-white dark:bg-slate-900 rounded-xl transition-all shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
            <AlertCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 id="regen-confirm-title" className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Batal
          </Button>
          <Button size="sm" onClick={onConfirm}>
            Ya, Regenerate
          </Button>
        </div>
      </div>
    </div>
  );
};
