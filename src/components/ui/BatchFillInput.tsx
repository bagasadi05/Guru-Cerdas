import React, { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';

/**
 * Simple batch fill input for quick-entering a single score/value across
 * all visible students. Extracted from Step2_StudentList for reuse across
 * mass input, grade input, and quiz input pages.
 */
export const BatchFillInput: React.FC<{
  students: { id: string }[];
  scores: Record<string, string>;
  onApply: (score: string) => void;
}> = ({ students, scores, onApply }) => {
  const [value, setValue] = useState('');
  const filledCount = students.filter((s) => scores[s.id]?.trim()).length;

  return (
    <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
      <span className="text-xs font-bold text-amber-700 dark:text-amber-300 whitespace-nowrap">
        Isi Massal:
      </span>
      <Input
        type="number"
        min="0"
        max="100"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Nilai"
        className="w-20 h-8 text-center text-sm font-bold bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-600 rounded-lg"
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
        className="h-8 px-3 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg"
      >
        Terapkan ke {students.length} siswa
      </Button>
      {filledCount > 0 && (
        <button
          type="button"
          onClick={() => onApply('')}
          className="text-xs text-rose-500 hover:text-rose-700 dark:text-rose-400 whitespace-nowrap ml-1"
        >
          ✕ Kosongkan
        </button>
      )}
    </div>
  );
};
