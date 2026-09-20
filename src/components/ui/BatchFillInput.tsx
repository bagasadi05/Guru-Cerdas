import React, { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { ConfirmationDialog } from './ConfirmationDialog';
import { Zap } from 'lucide-react';

/**
 * Simple batch fill input for quick-entering a single score/value across
 * all visible students. Extracted from Step2_StudentList for reuse across
 * mass input, grade input, and quiz input pages.
 */
export const BatchFillInput: React.FC<{
  students: { id: string }[];
  scores: Record<string, string>;
  onApply: (score: string) => void;
  onClearRequest?: () => void;
  onClose?: () => void;
}> = ({ students, scores, onApply, onClearRequest, onClose }) => {
  const [value, setValue] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const filledCount = students.filter((s) => scores[s.id]?.trim()).length;

  const handleClearClick = () => {
    if (onClearRequest) {
      onClearRequest();
    } else {
      setShowConfirmClear(true);
    }
  };

  const handleConfirmClear = () => {
    onApply('');
    setShowConfirmClear(false);
  };

  return (
    <>
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs font-bold text-amber-700 dark:text-amber-300 whitespace-nowrap flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="hidden xs:inline">Isi Semua:</span>
          </span>
          <Input
            type="number"
            min="0"
            max="100"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Nilai"
            className="w-16 sm:w-20 h-8 text-center text-sm font-bold bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-600 rounded-lg focus:ring-amber-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && value.trim()) {
                onApply(value);
                setValue('');
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (value.trim()) {
                onApply(value);
                setValue('');
              }
            }}
            disabled={!value.trim()}
            className="h-8 px-2.5 sm:px-3 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm whitespace-nowrap"
          >
            <span className="hidden sm:inline">Terapkan ke {students.length} siswa</span>
            <span className="sm:hidden">Terapkan ({students.length})</span>
          </Button>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {filledCount > 0 && (
            <button
              type="button"
              onClick={handleClearClick}
              className="text-xs text-rose-500 hover:text-rose-700 dark:text-rose-400 whitespace-nowrap px-1.5 py-1 rounded hover:bg-rose-500/10 transition-colors"
            >
              ✕ Kosongkan
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1.5 py-1 rounded hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors"
              title="Tutup panel isi massal"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {showConfirmClear && (
        <ConfirmationDialog
          isOpen={showConfirmClear}
          onClose={() => setShowConfirmClear(false)}
          onConfirm={handleConfirmClear}
          title="Kosongkan Semua Nilai?"
          message={`Tindakan ini akan mengosongkan nilai untuk ${filledCount} siswa yang sudah terisi.`}
          confirmText="Kosongkan"
          cancelText="Batal"
          variant="danger"
        />
      )}
    </>
  );
};
