import React from 'react';
import { ArrowLeft, CalendarRange, BookOpen } from 'lucide-react';
import type { PerangkatAjarMode } from '../types/perangkatAjarPageTypes';

interface PerangkatAjarSubNavProps {
  mode: PerangkatAjarMode;
  onSelectMode: (mode: PerangkatAjarMode) => void;
}

export const PerangkatAjarSubNav: React.FC<PerangkatAjarSubNavProps> = ({
  mode,
  onSelectMode,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:px-5 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
        <button
          onClick={() => onSelectMode(null)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all min-h-[40px]"
          title="Kembali ke pilihan menu Perangkat Ajar"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Pilihan Menu</span>
        </button>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
          Perangkat Ajar <span className="mx-1">/</span>{' '}
          <strong className="text-slate-800 dark:text-slate-200">
            {mode === 'modul-ajar' ? 'Modul Ajar (RPP)' : 'Prota & Promes'}
          </strong>
        </div>
      </div>

      {/* Quick Module Switcher */}
      <div className="grid grid-cols-2 sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl w-full sm:w-auto border border-slate-200/50 dark:border-slate-700/50">
        <button
          onClick={() => onSelectMode('prota-promes')}
          className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-0 ${
            mode === 'prota-promes'
              ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <CalendarRange className="w-3.5 h-3.5" />
          <span>Prota &amp; Promes</span>
        </button>
        <button
          onClick={() => onSelectMode('modul-ajar')}
          className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-0 ${
            mode === 'modul-ajar'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Modul Ajar</span>
        </button>
      </div>
    </div>
  );
};
