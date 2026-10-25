import React from 'react';
import { BookOpen, Sparkles, Bot, Loader2, Plus } from 'lucide-react';
import type { CurriculumType } from '../../../../../types/perangkatAjar';

interface ProtaToolbarProps {
  curriculum: CurriculumType;
  onChangeCurriculum: (curriculum: CurriculumType) => void;
  itemsCount: number;
  hasDiscrepancy: boolean;
  onOpenWizard?: () => void;
  onAutoBalance?: () => void;
  onFillWithAi?: () => void;
  isAiBusy?: boolean;
  onLoadSampleData?: () => void;
  onToggleAdding: () => void;
}

export const ProtaToolbar: React.FC<ProtaToolbarProps> = ({
  curriculum,
  onChangeCurriculum,
  itemsCount,
  hasDiscrepancy,
  onOpenWizard,
  onAutoBalance,
  onFillWithAi,
  isAiBusy = false,
  onLoadSampleData,
  onToggleAdding,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilihan Kurikulum:</span>
        </div>
        <div className="grid grid-cols-2 sm:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onChangeCurriculum('MERDEKA')}
            className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
              curriculum === 'MERDEKA'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <span className="sm:hidden">Merdeka</span>
            <span className="hidden sm:inline">Kurikulum Merdeka (CP/TP)</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeCurriculum('K13')}
            className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
              curriculum === 'K13'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <span className="sm:hidden">K13</span>
            <span className="hidden sm:inline">Kurikulum 2013 (KI/KD)</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
        {onOpenWizard && (
          <button
            type="button"
            onClick={onOpenWizard}
            className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/50 hover:bg-brand-100 dark:hover:bg-brand-900/60 rounded-xl transition-colors border border-brand-200 dark:border-brand-800 cursor-pointer active:scale-95"
            title="Buka panduan cepat pembuatan Prota & Promes"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span>Panduan Cepat</span>
          </button>
        )}

        {onAutoBalance && itemsCount > 0 && hasDiscrepancy && (
          <button
            type="button"
            onClick={onAutoBalance}
            className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/80 rounded-xl transition-colors border border-amber-300 dark:border-amber-700 cursor-pointer active:scale-95 shadow-sm"
            title="Seimbangkan Alokasi Jam Mengajar Otomatis"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Seimbangkan JP</span>
          </button>
        )}

        {onFillWithAi && (
          <button
            type="button"
            onClick={onFillWithAi}
            disabled={isAiBusy}
            className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer active:scale-95 disabled:opacity-60"
            title={
              itemsCount > 0
                ? 'Ganti seluruh materi dengan draf dari AI (bisa dibatalkan)'
                : 'Buat draf elemen, TP, dan bab dengan AI'
            }
          >
            {isAiBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
            <span>{isAiBusy ? 'AI menyusun...' : 'Susun dengan AI'}</span>
          </button>
        )}

        {itemsCount === 0 && onLoadSampleData && (
          <button
            type="button"
            onClick={onLoadSampleData}
            className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer active:scale-95"
            title="Isi dengan bab dan TP contoh dari buku Kurikulum Merdeka untuk mapel dan kelas ini"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Muat Bab Bawaan</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleAdding}
          className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-4 py-2 min-h-[40px] text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors shadow-sm cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Materi ({curriculum === 'K13' ? 'KD' : 'TP'})</span>
        </button>
      </div>
    </div>
  );
};
