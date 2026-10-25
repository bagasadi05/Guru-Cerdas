import React from 'react';
import { Calendar, Layers, FileSpreadsheet, Eye } from 'lucide-react';
import type { PerangkatAjarTab } from '../types/perangkatAjarPageTypes';

interface PerangkatAjarTabsNavProps {
  activeTab: PerangkatAjarTab;
  onChangeTab: (tab: PerangkatAjarTab) => void;
  isProtaBalanced: boolean;
}

export const PerangkatAjarTabsNav: React.FC<PerangkatAjarTabsNavProps> = ({
  activeTab,
  onChangeTab,
  isProtaBalanced,
}) => {
  return (
    <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar scroll-smooth space-x-1 sm:space-x-2 -mx-1 px-1">
      <button
        onClick={() => onChangeTab('kaldik')}
        className={`flex items-center gap-2 py-3 px-3.5 sm:px-4 text-xs font-bold border-b-2 whitespace-nowrap min-h-[44px] transition-all shrink-0 ${
          activeTab === 'kaldik'
            ? 'border-brand-600 text-brand-600 dark:text-brand-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        <Calendar className="w-4 h-4 shrink-0" />
        <span className="sm:hidden">1. Kaldik &amp; RME</span>
        <span className="hidden sm:inline">1. Kalender Pendidikan &amp; RME</span>
      </button>

      <button
        onClick={() => onChangeTab('prota')}
        className={`flex items-center gap-2 py-3 px-3.5 sm:px-4 text-xs font-bold border-b-2 whitespace-nowrap min-h-[44px] transition-all shrink-0 ${
          activeTab === 'prota'
            ? 'border-brand-600 text-brand-600 dark:text-brand-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        <Layers className="w-4 h-4 shrink-0" />
        <span className="sm:hidden">2. Prota</span>
        <span className="hidden sm:inline">2. Program Tahunan (Prota)</span>
        {!isProtaBalanced && (
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        )}
      </button>

      <button
        onClick={() => onChangeTab('promes')}
        className={`flex items-center gap-2 py-3 px-3.5 sm:px-4 text-xs font-bold border-b-2 whitespace-nowrap min-h-[44px] transition-all shrink-0 ${
          activeTab === 'promes'
            ? 'border-brand-600 text-brand-600 dark:text-brand-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        <FileSpreadsheet className="w-4 h-4 shrink-0" />
        <span className="sm:hidden">3. Promes</span>
        <span className="hidden sm:inline">3. Program Semester (Promes)</span>
      </button>

      <button
        onClick={() => onChangeTab('preview')}
        className={`flex items-center gap-2 py-3 px-3.5 sm:px-4 text-xs font-bold border-b-2 whitespace-nowrap min-h-[44px] transition-all shrink-0 ${
          activeTab === 'preview'
            ? 'border-brand-600 text-brand-600 dark:text-brand-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        <Eye className="w-4 h-4 shrink-0" />
        <span className="sm:hidden">4. Pratinjau &amp; Ekspor</span>
        <span className="hidden sm:inline">4. Pratinjau &amp; Ekspor Resmi</span>
      </button>
    </div>
  );
};
